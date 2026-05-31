/**
 * Integration test: dispatch → travel → on-scene dwell → resolve → score.
 *
 * Unit tests for computeOutcome (shift.test.ts) hand-set `resolved_at_game_min`
 * to arbitrary values, so they never exercise the timing the REAL simulation
 * produces. This test drives the actual `tickStep` FSM and then scores the
 * result, which surfaces how the live resolve-time relates to the SLA deadline.
 *
 * KEY RELATIONSHIP under test:
 *   - tickStep resolves an incident `resolution_window_game_min` AFTER the unit
 *     arrives on-scene (the dwell timer).
 *   - classify() in shift.ts treats `due_by = spawn + resolution_window` as the
 *     in-window deadline.
 *   => resolved_at ≈ arrival + window, due_by = spawn + window,
 *      so late_by ≈ arrival - spawn = the response/travel time.
 */
import { describe, it, expect } from "vitest";
import { tickStep, UNIT_SPEED_M_PER_GAME_MIN } from "./dispatch";
import { computeOutcome } from "./shift";
import type { Unit, Incident, Vehicle, Address, Station } from "@/lib/schemas";
import type { Shift } from "@/lib/schemas";

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: "u1",
    callsign: "E1",
    vehicle_id: "v1",
    homebase_station_id: "s1",
    status: "available",
    status_since_game_min: 0,
    current_position: [0, 0],
    crew: [],
    ...over,
  };
}

function makeIncident(over: Partial<Incident> = {}): Incident {
  return {
    id: "i1",
    type: "alarm_false",
    severity: "low",
    status: "dispatched",
    address_id: "addr_0",
    reported_at_game_min: 0,
    resolution_window_game_min: 2,
    dispatched_unit_ids: ["u1"],
    shift_id: "test",
    required_unit_classes: [],
    ...over,
  };
}

function oneIncidentShift(window: number): Shift {
  return {
    id: "test",
    date: "2026-05-28",
    city: "quad_cities",
    difficulty_tier: 1,
    length_game_min: 60,
    narrative_threads: [],
    incidents: [
      {
        id: "i1",
        spawn_time_game_min: 0,
        type: "alarm_false",
        severity: "low",
        address: "x",
        required_units: [],
        resolution_window_game_min: window,
        narrative_hooks: [],
      },
    ],
    intel: [],
  } as Shift;
}

/** Run tickStep until the incident resolves; return the game_min it resolved. */
function simulateToResolution(unit: Unit, incident: Incident): {
  resolved_at: number;
  incidents: Map<string, Incident>;
} {
  const units = new Map<string, Unit>([[unit.id, unit]]);
  const incidents = new Map<string, Incident>([[incident.id, incident]]);
  const ctx = {
    units,
    incidents,
    road_graph: null,
    addresses: new Map<string, Address>(),
    stations: new Map<string, Station>(),
    vehicles: new Map<string, Vehicle>(),
  };
  const dt = 0.1;
  let game_min = 0;
  for (let i = 0; i < 2000; i++) {
    game_min = +(game_min + dt).toFixed(4);
    tickStep(dt, { ...ctx, game_min, events: [] });
    if (incidents.get(incident.id)!.status === "resolved") break;
  }
  return { resolved_at: incidents.get(incident.id)!.resolved_at_game_min!, incidents };
}

describe("scoring integration — resolution timing vs SLA window", () => {
  it("a realistically-dispatched incident (any travel time) grades LATE — in-window is unreachable", () => {
    const window = 2;
    // Unit dispatched at spawn (t=0), 1 game-min of travel ahead of it.
    const unit = makeUnit({
      status: "en_route",
      status_since_game_min: 0,
      current_route: [
        [0, 0],
        [0, 1],
      ],
      route_progress_m: 0,
      route_total_m: UNIT_SPEED_M_PER_GAME_MIN * 1.0, // 1 game-min of travel
      destination_coord: [0, 1],
      on_arrival: "on_scene",
      current_incident_id: "i1",
    });
    const incident = makeIncident({ resolution_window_game_min: window });

    const { resolved_at, incidents } = simulateToResolution(unit, incident);

    // arrival ≈ 1.0, dwell = window → resolved ≈ 3.0, due_by = 2.0.
    expect(resolved_at).toBeGreaterThan(window); // resolved AFTER the SLA deadline

    const out = computeOutcome(oneIncidentShift(window), incidents);
    // BUG: even dispatched instantly at spawn with modest travel, the only
    // outcome the engine can produce is "late". The dwell timer consumes the
    // entire SLA window, leaving zero budget for response/travel.
    expect(out.per_incident[0].outcome).toBe("resolved_late");
    expect(out.grade).toBe("C"); // 0.5 score → capped at C
  });

  it("in-window is ONLY reachable with zero response time (unit already on-scene at spawn)", () => {
    const window = 2;
    // Unit already on-scene at t=0 — dwell starts immediately, resolves at
    // exactly due_by. This is the sole in-window case, and it's physically
    // impossible in real play (units start at stations, incidents are remote).
    const unit = makeUnit({
      status: "on_scene",
      status_since_game_min: 0,
      current_incident_id: "i1",
      current_position: [0, 1],
    });
    const incident = makeIncident({
      status: "on_scene",
      resolution_window_game_min: window,
    });

    const { resolved_at, incidents } = simulateToResolution(unit, incident);
    expect(resolved_at).toBeCloseTo(window, 1); // ≈ due_by

    const out = computeOutcome(oneIncidentShift(window), incidents);
    expect(out.per_incident[0].outcome).toBe("resolved_in_window");
  });
});
