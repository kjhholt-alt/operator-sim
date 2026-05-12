/**
 * Day 14 — floor snapshot round-trip tests.
 *
 * Exercises serializeFloor + applySnapshot only. Dexie writes are a thin
 * wrapper on Dexie itself and need a real IndexedDB; covered by the
 * SavesPanel smoke check in-browser.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useFloor } from "./useFloor";
import {
  applySnapshot,
  serializeFloor,
  slugForSaveName,
  SNAPSHOT_VERSION,
} from "./persist";
import type { Unit, Incident, Shift } from "@/lib/schemas";

const station = {
  id: "st_test",
  name: "Test Central",
  agency: "fire" as const,
  address_id: "addr_1",
  built_at: "2026-05-09T00:00:00Z",
  capacity_units: 4,
  capacity_personnel: 24,
};

const unit: Unit = {
  id: "u_test",
  callsign: "T1",
  vehicle_id: "v_test",
  homebase_station_id: "st_test",
  status: "available",
  status_since_game_min: 0,
  current_position: [-90.58, 41.52],
  crew: ["p_001"],
};

const incident: Incident = {
  id: "i_test",
  type: "medical_general",
  severity: "moderate",
  status: "queued",
  address_id: "addr_1",
  reported_at_game_min: 1.5,
  resolution_window_game_min: 2.0,
  dispatched_unit_ids: [],
  required_unit_classes: [],
  shift_id: "s_test",
};

const shift: Shift = {
  id: "s_test",
  date: "2026-05-09",
  city: "quad_cities",
  difficulty_tier: 1,
  length_game_min: 12,
  narrative_threads: [],
  incidents: [
    {
      id: "shi_test_001",
      spawn_time_game_min: 1.0,
      type: "medical_general",
      severity: "moderate",
      address: "100 Main",
      resolution_window_game_min: 2.0,
      required_units: [],
      narrative_hooks: [],
    },
  ],
  intel: [],
};

function seedSyntheticFloor() {
  useFloor.setState({
    speed: 2,
    paused: false,
    game_min: 4.25,
    shift_id: shift.id,

    shift,
    shift_status: "running",
    incidents_spawned: new Set(["shi_test_001"]),
    shift_outcome: null,
    available_shifts: [shift],
    unit_homebases: new Map([[unit.id, unit.current_position]]),

    units: new Map([[unit.id, unit]]),
    incidents: new Map([[incident.id, incident]]),
    callers: new Map(),
    addresses: new Map(),
    personnel: new Map(),
    intel: new Map(),
    stations: new Map([[station.id, station]]),
    vehicles: new Map(),

    selection: { kind: "unit", id: unit.id },
    nav_back: [{ kind: "incident", id: incident.id }],
    nav_forward: [],
    camera: { center: [-90.58, 41.52], zoom: 13 },

    view_mode: "city",
    city_tod_override: 0.75,

    last_event_log: [{ ts: 1, game_min: 4.25, text: "synthetic seed" }],
  });
}

describe("Day 14 floor snapshot round-trip", () => {
  beforeEach(() => seedSyntheticFloor());

  it("serializeFloor produces a JSON-able value at version 1", () => {
    const snap = serializeFloor(useFloor.getState());
    expect(snap.v).toBe(SNAPSHOT_VERSION);
    // Round-trip through JSON to prove no live Maps/Sets leaked through.
    const wire = JSON.parse(JSON.stringify(snap));
    expect(wire.units).toEqual(snap.units);
    expect(wire.incidents_spawned).toEqual(["shi_test_001"]);
  });

  it("applySnapshot restores entity maps and history", () => {
    const snap = serializeFloor(useFloor.getState());
    // Mutate the live state, then apply the saved snap back.
    useFloor.setState({
      units: new Map(),
      incidents: new Map(),
      stations: new Map(),
      game_min: 9999,
      selection: null,
      nav_back: [],
    });
    applySnapshot(snap);
    const s = useFloor.getState();
    expect(s.units.size).toBe(1);
    expect(s.units.get(unit.id)?.callsign).toBe("T1");
    expect(s.incidents.get(incident.id)?.type).toBe("medical_general");
    expect(s.stations.size).toBe(1);
    expect(s.game_min).toBeCloseTo(4.25);
    expect(s.selection).toEqual({ kind: "unit", id: unit.id });
    expect(s.nav_back).toHaveLength(1);
  });

  it("applySnapshot restores shift + spawned set", () => {
    const snap = serializeFloor(useFloor.getState());
    useFloor.setState({ shift: null, shift_status: "idle", incidents_spawned: new Set() });
    applySnapshot(snap);
    const s = useFloor.getState();
    expect(s.shift?.id).toBe("s_test");
    expect(s.shift_status).toBe("running");
    expect(s.incidents_spawned.has("shi_test_001")).toBe(true);
  });

  it("applySnapshot preserves road_graph (immutable bake)", () => {
    const sentinel = { nodes: new Map(), edges: new Map(), index: null } as never;
    useFloor.setState({ road_graph: sentinel });
    const snap = serializeFloor(useFloor.getState());
    applySnapshot(snap);
    expect(useFloor.getState().road_graph).toBe(sentinel);
  });

  it("applySnapshot rejects an unsupported version", () => {
    const snap = serializeFloor(useFloor.getState());
    const bad = { ...snap, v: 99 as typeof SNAPSHOT_VERSION };
    expect(() => applySnapshot(bad)).toThrow(/unsupported snapshot version/);
  });
});

describe("slugForSaveName", () => {
  it("lowercases + dasherises + strips junk", () => {
    expect(slugForSaveName("My First Save!")).toBe("my-first-save");
    expect(slugForSaveName("  T1 Run #3  ")).toBe("t1-run-3");
  });

  it("falls back to a timestamped slug for blank input", () => {
    const slug = slugForSaveName("   ");
    expect(slug).toMatch(/^save-\d+$/);
  });

  it("is idempotent on an already-valid slug", () => {
    expect(slugForSaveName("hello-world")).toBe("hello-world");
  });
});
