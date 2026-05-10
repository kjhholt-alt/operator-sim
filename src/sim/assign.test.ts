/**
 * Operator Sim — Day 10 closest-unit auto-assign tests.
 *
 * Verifies pickClosestAvailable picks by haversine distance, that assign
 * fans out across required classes (one per class), and that it's a no-op
 * when the requirement is already filled.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useFloor } from "@/state/useFloor";
import {
  assignClosest,
  pickClosestAvailable,
  compatibleClassesFor,
  isClassCompatible,
} from "./assign";
import { buildRoadGraph } from "./roadGraph";
import type {
  Address,
  Incident,
  IncidentType,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";

// East-west line through downtown, long enough that all picks have unique routes.
const LINE_ROADS = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: null,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-90.585, 41.520],
          [-90.580, 41.520],
          [-90.575, 41.520],
          [-90.570, 41.520],
          [-90.565, 41.520],
          [-90.560, 41.520],
        ],
      },
    },
  ],
};

function seedTwoStations(): void {
  const stCentral: Station = {
    id: "st_central",
    name: "Davenport Central",
    agency: "fire",
    address_id: "addr_central",
    built_at: "2026-05-09T00:00:00Z",
    capacity_units: 4,
    capacity_personnel: 24,
  };
  const stEast: Station = {
    id: "st_east",
    name: "Davenport East",
    agency: "fire",
    address_id: "addr_east",
    built_at: "2026-05-09T00:00:00Z",
    capacity_units: 3,
    capacity_personnel: 16,
  };
  const addrs: Address[] = [
    { id: "addr_central", street: "Central Rd", city: "Davenport", state: "IA", coord: [-90.585, 41.520] },
    { id: "addr_east",    street: "East Ave",   city: "Davenport", state: "IA", coord: [-90.560, 41.520] },
    { id: "addr_scene_w", street: "West Scene", city: "Davenport", state: "IA", coord: [-90.580, 41.520] }, // close to central
    { id: "addr_scene_e", street: "East Scene", city: "Davenport", state: "IA", coord: [-90.565, 41.520] }, // close to east
  ];
  const vehicles: Vehicle[] = [
    { id: "v_e1", callsign: "E1", class: "engine",        homebase_station_id: stCentral.id, purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_m1", callsign: "M1", class: "ambulance_als", homebase_station_id: stCentral.id, purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_e2", callsign: "E2", class: "engine",        homebase_station_id: stEast.id,    purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_m2", callsign: "M2", class: "ambulance_als", homebase_station_id: stEast.id,    purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
  ];
  const units: Unit[] = [
    { id: "u_e1", callsign: "E1", vehicle_id: "v_e1", homebase_station_id: stCentral.id, status: "available", status_since_game_min: 0, current_position: [-90.585, 41.520], crew: [] },
    { id: "u_m1", callsign: "M1", vehicle_id: "v_m1", homebase_station_id: stCentral.id, status: "available", status_since_game_min: 0, current_position: [-90.585, 41.520], crew: [] },
    { id: "u_e2", callsign: "E2", vehicle_id: "v_e2", homebase_station_id: stEast.id,    status: "available", status_since_game_min: 0, current_position: [-90.560, 41.520], crew: [] },
    { id: "u_m2", callsign: "M2", vehicle_id: "v_m2", homebase_station_id: stEast.id,    status: "available", status_since_game_min: 0, current_position: [-90.560, 41.520], crew: [] },
  ];

  useFloor.setState({
    speed: 1, paused: false, game_min: 0,
    addresses: new Map(addrs.map((a) => [a.id, a])),
    stations: new Map([[stCentral.id, stCentral], [stEast.id, stEast]]),
    vehicles: new Map(vehicles.map((v) => [v.id, v])),
    personnel: new Map(),
    units: new Map(units.map((u) => [u.id, u])),
    incidents: new Map(),
    callers: new Map(),
    intel: new Map(),
    road_graph: buildRoadGraph(LINE_ROADS),
    last_event_log: [],
  });
}

function spawnIncident(id: string, addr_id: string, required: ("engine" | "ambulance_als")[] = []): Incident {
  const inc: Incident = {
    id,
    type: required.includes("engine") && required.includes("ambulance_als") ? "rescue_motor_vehicle" : "alarm_false",
    severity: "moderate",
    status: "queued",
    address_id: addr_id,
    reported_at_game_min: 0,
    resolution_window_game_min: 2,
    dispatched_unit_ids: [],
    shift_id: "test",
    required_unit_classes: required,
  };
  const next = new Map(useFloor.getState().incidents);
  next.set(inc.id, inc);
  useFloor.setState({ incidents: next });
  return inc;
}

describe("pickClosestAvailable", () => {
  beforeEach(() => seedTwoStations());

  it("picks the closer station's unit for a westside incident", () => {
    const s = useFloor.getState();
    const pick = pickClosestAvailable([-90.580, 41.520], "engine", s.units, s.vehicles, new Set());
    expect(pick?.id).toBe("u_e1"); // central engine, ~440m vs east engine ~1700m
  });

  it("picks the closer station's unit for an eastside incident", () => {
    const s = useFloor.getState();
    const pick = pickClosestAvailable([-90.565, 41.520], "engine", s.units, s.vehicles, new Set());
    expect(pick?.id).toBe("u_e2"); // east engine
  });

  it("respects the excluded set", () => {
    const s = useFloor.getState();
    const pick = pickClosestAvailable([-90.580, 41.520], "engine", s.units, s.vehicles, new Set(["u_e1"]));
    expect(pick?.id).toBe("u_e2"); // central engine excluded → east is next
  });

  it("returns null when no unit of the requested class is available", () => {
    // Mark every engine non-available
    const s = useFloor.getState();
    const next = new Map(s.units);
    for (const [id, u] of next) {
      if (s.vehicles.get(u.vehicle_id)?.class === "engine") {
        next.set(id, { ...u, status: "en_route" });
      }
    }
    useFloor.setState({ units: next });
    const pick = pickClosestAvailable([-90.580, 41.520], "engine", useFloor.getState().units, useFloor.getState().vehicles, new Set());
    expect(pick).toBeNull();
  });

  it("matches any-class when klass is null", () => {
    const s = useFloor.getState();
    const pick = pickClosestAvailable([-90.585, 41.520], null, s.units, s.vehicles, new Set());
    // Both u_e1 and u_m1 sit at -90.585 — first-match-wins; either is fine,
    // but it MUST be a central-station unit.
    expect(["u_e1", "u_m1"]).toContain(pick?.id);
  });
});

describe("assignClosest (single-unit incidents)", () => {
  beforeEach(() => seedTwoStations());

  it("picks the closest available unit when the incident has no required classes", () => {
    spawnIncident("i_w", "addr_scene_w");
    const r = assignClosest("i_w");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.assigned).toHaveLength(1);
    // Central is closer to West Scene
    expect(["u_e1", "u_m1"]).toContain(r.assigned[0].unit_id);
  });

  it("rejects assigning to an already-resolved incident", () => {
    spawnIncident("i_done", "addr_scene_w");
    const incs = new Map(useFloor.getState().incidents);
    incs.set("i_done", { ...incs.get("i_done")!, status: "resolved" });
    useFloor.setState({ incidents: incs });
    const r = assignClosest("i_done");
    expect(r.ok).toBe(false);
  });

  it("rejects when the single-unit incident already has a unit assigned", () => {
    spawnIncident("i_taken", "addr_scene_w");
    const incs = new Map(useFloor.getState().incidents);
    incs.set("i_taken", { ...incs.get("i_taken")!, dispatched_unit_ids: ["u_e1"] });
    useFloor.setState({ incidents: incs });
    const r = assignClosest("i_taken");
    expect(r.ok).toBe(false);
  });
});

describe("assignClosest (multi-unit incidents)", () => {
  beforeEach(() => seedTwoStations());

  it("fans out across required classes, picking each closest", () => {
    spawnIncident("i_mva_w", "addr_scene_w", ["engine", "ambulance_als"]);
    const r = assignClosest("i_mva_w");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.assigned).toHaveLength(2);
    const byClass = Object.fromEntries(r.assigned.map((p) => [p.class, p.unit_id]));
    // West Scene: central is closer for both classes
    expect(byClass.engine).toBe("u_e1");
    expect(byClass.ambulance_als).toBe("u_m1");
  });

  it("falls back to the second-station unit when the first station's class is busy", () => {
    // Mark central engine as en_route
    const s = useFloor.getState();
    const u = new Map(s.units);
    u.set("u_e1", { ...u.get("u_e1")!, status: "en_route" });
    useFloor.setState({ units: u });

    spawnIncident("i_mva_w2", "addr_scene_w", ["engine", "ambulance_als"]);
    const r = assignClosest("i_mva_w2");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byClass = Object.fromEntries(r.assigned.map((p) => [p.class, p.unit_id]));
    expect(byClass.engine).toBe("u_e2"); // central was busy, east takes it
    expect(byClass.ambulance_als).toBe("u_m1");
  });

  it("rejects when a required class has no available unit", () => {
    // Mark BOTH engines non-available
    const s = useFloor.getState();
    const u = new Map(s.units);
    u.set("u_e1", { ...u.get("u_e1")!, status: "en_route" });
    u.set("u_e2", { ...u.get("u_e2")!, status: "en_route" });
    useFloor.setState({ units: u });

    spawnIncident("i_no_engine", "addr_scene_w", ["engine", "ambulance_als"]);
    const r = assignClosest("i_no_engine");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/no available engine/);
  });

  it("skips classes already covered by previously-dispatched units", () => {
    // Pre-dispatch the central engine to the incident, then call assign
    spawnIncident("i_partial", "addr_scene_w", ["engine", "ambulance_als"]);
    const incs = new Map(useFloor.getState().incidents);
    incs.set("i_partial", { ...incs.get("i_partial")!, dispatched_unit_ids: ["u_e1"] });
    useFloor.setState({ incidents: incs });
    // Mark u_e1 as en_route to reflect the manual dispatch
    const u = new Map(useFloor.getState().units);
    u.set("u_e1", { ...u.get("u_e1")!, status: "en_route" });
    useFloor.setState({ units: u });

    const r = assignClosest("i_partial");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Should ONLY add the ambulance, not another engine
    expect(r.assigned).toHaveLength(1);
    expect(r.assigned[0].class).toBe("ambulance_als");
    expect(r.assigned[0].unit_id).toBe("u_m1");
  });
});

// ─── Day 13: agency filtering ────────────────────────────────────────

describe("compatibleClassesFor / isClassCompatible (Day 13)", () => {
  it("medical_cardiac admits ambulances + supervisor only", () => {
    const compat = compatibleClassesFor("medical_cardiac");
    expect(compat).toContain("ambulance_als");
    expect(compat).toContain("supervisor");
    expect(compat).not.toContain("engine");
    expect(compat).not.toContain("patrol");
  });

  it("police_burglary admits patrol + k9 + supervisor only", () => {
    const compat = compatibleClassesFor("police_burglary");
    expect(compat).toContain("patrol");
    expect(compat).toContain("k9");
    expect(compat).not.toContain("engine");
    expect(compat).not.toContain("ambulance_als");
  });

  it("fire_residential admits engine + ladder + rescue + command", () => {
    const compat = compatibleClassesFor("fire_residential");
    expect(compat).toEqual(expect.arrayContaining(["engine", "ladder", "rescue", "command"]));
    expect(compat).not.toContain("patrol");
    expect(compat).not.toContain("ambulance_als");
  });

  it("rescue_motor_vehicle admits both fire + EMS classes", () => {
    expect(isClassCompatible("rescue_motor_vehicle", "engine")).toBe(true);
    expect(isClassCompatible("rescue_motor_vehicle", "rescue")).toBe(true);
    expect(isClassCompatible("rescue_motor_vehicle", "ambulance_als")).toBe(true);
    expect(isClassCompatible("rescue_motor_vehicle", "patrol")).toBe(false);
  });

  it("alarm_false admits engine only (light response)", () => {
    expect(isClassCompatible("alarm_false", "engine")).toBe(true);
    expect(isClassCompatible("alarm_false", "ambulance_als")).toBe(false);
    expect(isClassCompatible("alarm_false", "patrol")).toBe(false);
  });

  it("every IncidentType in the registry has a non-empty compat list", () => {
    // Lock the table so a future schema addition doesn't silently land
    // an incident type that auto-picks any random unit.
    const types: IncidentType[] = [
      "fire_residential", "fire_commercial", "fire_vehicle", "fire_brush",
      "medical_cardiac", "medical_trauma", "medical_general",
      "rescue_motor_vehicle", "rescue_water",
      "hazmat_spill",
      "alarm_false", "service_call",
      "police_disturbance", "police_traffic", "police_burglary", "police_assault",
    ];
    for (const t of types) {
      const compat = compatibleClassesFor(t);
      expect(compat.length, `${t} has no compatible classes`).toBeGreaterThan(0);
    }
  });
});

describe("pickClosestAvailable with compatibleClasses filter (Day 13)", () => {
  beforeEach(() => seedTwoStations());

  it("falls through engines when only ambulances are compatible", () => {
    const s = useFloor.getState();
    // Scene closer to central — but with compat = [ambulance_als], the
    // engine is filtered out and the ambulance wins even though both
    // sit at the same coord.
    const pick = pickClosestAvailable(
      [-90.580, 41.520], null, s.units, s.vehicles, new Set(),
      ["ambulance_als"],
    );
    expect(pick?.id).toBe("u_m1");
  });

  it("returns null when no compatible class is available", () => {
    const s = useFloor.getState();
    // No `patrol` units are seeded — police_burglary compat would
    // return nothing.
    const pick = pickClosestAvailable(
      [-90.580, 41.520], null, s.units, s.vehicles, new Set(),
      ["patrol", "k9"],
    );
    expect(pick).toBeNull();
  });

  it("an empty compat list falls back to any-class behaviour", () => {
    const s = useFloor.getState();
    const pick = pickClosestAvailable(
      [-90.585, 41.520], null, s.units, s.vehicles, new Set(),
      [],
    );
    expect(["u_e1", "u_m1"]).toContain(pick?.id);
  });
});

describe("assignClosest agency filter on single-unit incidents (Day 13)", () => {
  beforeEach(() => seedTwoStations());

  it("medical_cardiac auto-picks the ambulance, not the closer engine", () => {
    // Override spawn helper to set a medical_cardiac incident manually
    const inc: Incident = {
      id: "i_med",
      type: "medical_cardiac",
      severity: "high",
      status: "queued",
      address_id: "addr_scene_w",
      reported_at_game_min: 0,
      resolution_window_game_min: 6,
      dispatched_unit_ids: [],
      shift_id: "test",
      required_unit_classes: [],
    };
    const next = new Map(useFloor.getState().incidents);
    next.set(inc.id, inc);
    useFloor.setState({ incidents: next });

    const r = assignClosest("i_med");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.assigned).toHaveLength(1);
    // Must be the ambulance — engine is closer but incompatible.
    expect(r.assigned[0].unit_id).toBe("u_m1");
    expect(r.assigned[0].class).toBe("ambulance_als");
  });

  it("police_burglary fails fast when no patrol is available", () => {
    // Roster has no patrol — this should reject explicitly.
    const inc: Incident = {
      id: "i_pol",
      type: "police_burglary",
      severity: "moderate",
      status: "queued",
      address_id: "addr_scene_w",
      reported_at_game_min: 0,
      resolution_window_game_min: 8,
      dispatched_unit_ids: [],
      shift_id: "test",
      required_unit_classes: [],
    };
    const next = new Map(useFloor.getState().incidents);
    next.set(inc.id, inc);
    useFloor.setState({ incidents: next });

    const r = assignClosest("i_pol");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/no available .*patrol.*unit/i);
  });

  it("fire_residential picks the engine even when an ambulance is closer", () => {
    // Move the ambulance closer to the scene than the engine.
    const s = useFloor.getState();
    const u = new Map(s.units);
    u.set("u_m1", { ...u.get("u_m1")!, current_position: [-90.5805, 41.520] });
    u.set("u_e1", { ...u.get("u_e1")!, current_position: [-90.585, 41.520] });
    useFloor.setState({ units: u });

    const inc: Incident = {
      id: "i_fire",
      type: "fire_residential",
      severity: "high",
      status: "queued",
      address_id: "addr_scene_w",
      reported_at_game_min: 0,
      resolution_window_game_min: 8,
      dispatched_unit_ids: [],
      shift_id: "test",
      required_unit_classes: [],
    };
    const next = new Map(useFloor.getState().incidents);
    next.set(inc.id, inc);
    useFloor.setState({ incidents: next });

    const r = assignClosest("i_fire");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Ambulance is closer but should be filtered out — engine wins.
    expect(r.assigned[0].unit_id).toBe("u_e1");
    expect(r.assigned[0].class).toBe("engine");
  });
});
