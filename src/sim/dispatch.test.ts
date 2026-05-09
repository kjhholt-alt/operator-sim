import { describe, it, expect, beforeEach } from "vitest";
import { useFloor } from "@/state/useFloor";
import { dispatch, tickStep, UNIT_SPEED_M_PER_GAME_MIN } from "./dispatch";
import { buildRoadGraph } from "./roadGraph";
import type {
  Address,
  Incident,
  Personnel,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";

// Synthetic 5-node line: stationA — n1 — n2 — n3 — sceneB.
// Long enough that en_route takes multiple ticks before arrival.
const SYNTH_ROADS = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: null,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-90.580, 41.520],
          [-90.578, 41.520],
          [-90.576, 41.520],
          [-90.574, 41.520],
          [-90.572, 41.520],
        ],
      },
    },
  ],
};

const STATION_COORD: [number, number] = [-90.580, 41.520];
const SCENE_COORD: [number, number] = [-90.572, 41.520];

function seedFloor(): { unit: Unit; incident: Incident } {
  const station: Station = {
    id: "st_a",
    name: "Test Station",
    agency: "fire",
    address_id: "addr_station",
    built_at: "2026-05-09T00:00:00Z",
    capacity_units: 4,
    capacity_personnel: 24,
  };
  const stationAddr: Address = {
    id: "addr_station",
    street: "Station Rd",
    city: "Davenport",
    state: "IA",
    coord: STATION_COORD,
  };
  const sceneAddr: Address = {
    id: "addr_scene",
    street: "Scene Ave",
    city: "Davenport",
    state: "IA",
    coord: SCENE_COORD,
  };
  const vehicle: Vehicle = {
    id: "v_e1",
    callsign: "E1",
    class: "engine",
    homebase_station_id: station.id,
    purchased_at: "2026-05-09T00:00:00Z",
    status: "operational",
    mileage_km: 0,
  };
  const personnel: Personnel = {
    id: "p_001",
    name: "FF Alpha",
    role: "firefighter",
    homebase_station_id: station.id,
    hire_date: "2026-03-12T00:00:00Z",
    skills: [],
    schedule_template: "standard",
    active: true,
  };
  const unit: Unit = {
    id: "u_e1",
    callsign: "E1",
    vehicle_id: vehicle.id,
    homebase_station_id: station.id,
    status: "available",
    status_since_game_min: 0,
    current_position: STATION_COORD,
    crew: [personnel.id],
  };
  const incident: Incident = {
    id: "i_42",
    type: "medical_cardiac",
    severity: "high",
    status: "queued",
    address_id: sceneAddr.id,
    reported_at_game_min: 0,
    resolution_window_game_min: 2, // short for test speed
    dispatched_unit_ids: [],
    shift_id: "test-shift",
  };

  useFloor.setState({
    speed: 1,
    paused: false,
    game_min: 0,
    addresses: new Map([
      [stationAddr.id, stationAddr],
      [sceneAddr.id, sceneAddr],
    ]),
    stations: new Map([[station.id, station]]),
    vehicles: new Map([[vehicle.id, vehicle]]),
    personnel: new Map([[personnel.id, personnel]]),
    units: new Map([[unit.id, unit]]),
    incidents: new Map([[incident.id, incident]]),
    road_graph: buildRoadGraph(SYNTH_ROADS),
    last_event_log: [],
  });
  return { unit, incident };
}

// Run the same logic the RAF loop uses, deterministically.
function runTick(delta_game_min: number): void {
  const s = useFloor.getState();
  const units = new Map(s.units);
  const incidents = new Map(s.incidents);
  const events: string[] = [];
  tickStep(delta_game_min, {
    game_min: s.game_min + delta_game_min,
    units,
    incidents,
    road_graph: s.road_graph,
    addresses: s.addresses,
    stations: s.stations,
    events,
  });
  useFloor.setState({
    game_min: s.game_min + delta_game_min,
    units,
    incidents,
  });
}

describe("dispatch FSM", () => {
  beforeEach(() => {
    useFloor.setState({
      units: new Map(),
      incidents: new Map(),
      addresses: new Map(),
      stations: new Map(),
      vehicles: new Map(),
      personnel: new Map(),
      road_graph: null,
      game_min: 0,
      last_event_log: [],
    });
  });

  it("rejects dispatch when road graph not loaded", () => {
    const r = dispatch("E1", "i_42");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/road graph/);
  });

  it("transitions available → en_route → on_scene → resolved → returning → available", () => {
    seedFloor();
    const r = dispatch("E1", "i_42");
    expect(r.ok).toBe(true);

    let unit = useFloor.getState().units.get("u_e1")!;
    let incident = useFloor.getState().incidents.get("i_42")!;
    expect(unit.status).toBe("en_route");
    expect(incident.status).toBe("dispatched");
    expect(incident.dispatched_unit_ids).toContain("u_e1");

    // Travel ~700m at 800 m/game-min — needs slightly less than 1 game-min.
    // Run small ticks until we see on_scene.
    for (let i = 0; i < 100; i++) {
      runTick(0.05); // 0.05 game-min per tick
      unit = useFloor.getState().units.get("u_e1")!;
      if (unit.status === "on_scene") break;
    }
    expect(unit.status).toBe("on_scene");
    incident = useFloor.getState().incidents.get("i_42")!;
    expect(incident.status).toBe("on_scene");

    // Dwell 2 game-min to trigger resolution + return.
    for (let i = 0; i < 100; i++) {
      runTick(0.05);
      unit = useFloor.getState().units.get("u_e1")!;
      if (unit.status === "returning") break;
    }
    expect(unit.status).toBe("returning");
    incident = useFloor.getState().incidents.get("i_42")!;
    expect(incident.status).toBe("resolved");
    expect(incident.resolved_at_game_min).toBeGreaterThan(0);

    // Drive home — full return distance again.
    for (let i = 0; i < 200; i++) {
      runTick(0.05);
      unit = useFloor.getState().units.get("u_e1")!;
      if (unit.status === "available") break;
    }
    expect(unit.status).toBe("available");
    expect(unit.current_incident_id).toBeUndefined();
    expect(unit.current_route).toBeUndefined();
    // Ended near the station coord (rounding tolerance).
    expect(unit.current_position[0]).toBeCloseTo(STATION_COORD[0], 3);
    expect(unit.current_position[1]).toBeCloseTo(STATION_COORD[1], 3);
  });

  it("rejects dispatching a unit that is not available", () => {
    seedFloor();
    dispatch("E1", "i_42"); // first dispatch ok
    const r = dispatch("E1", "i_42"); // second should reject — unit en_route
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not available/);
  });

  it("UNIT_SPEED_M_PER_GAME_MIN is set to a sensible 30-mph average", () => {
    expect(UNIT_SPEED_M_PER_GAME_MIN).toBeGreaterThan(500);
    expect(UNIT_SPEED_M_PER_GAME_MIN).toBeLessThan(2000);
  });
});
