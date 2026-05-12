/**
 * Operator Sim — Day 9 lobby + shift-control verb tests.
 *
 * Validates the start / restart / end_shift / lobby verbs end-to-end against
 * the live store, plus the returnToLobby reset that the ShiftSummary modal
 * triggers when the player picks a new shift after a completed one.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useFloor } from "@/state/useFloor";
import { executeInput, suggestForInput, parseInput } from "./verbs";
import { parseShift } from "./shift";
import type { Shift, Unit } from "@/lib/schemas";

const TIER1_YAML = `
id: t1
date: 2026-05-09
city: quad_cities
difficulty_tier: 1
length_game_min: 6
notes: Test tier 1.
incidents:
  - id: i_01
    spawn_time_game_min: 0
    type: alarm_false
    severity: low
    address: 100 Main St
    resolution_window_game_min: 1
intel: []
narrative_threads: []
`;
const TIER2_YAML = `
id: t2
date: 2026-05-09
city: quad_cities
difficulty_tier: 2
length_game_min: 8
notes: Test tier 2.
incidents:
  - id: i_02
    spawn_time_game_min: 1
    type: medical_general
    severity: moderate
    address: 100 Main St
    resolution_window_game_min: 1
    required_units: [ambulance_als]
intel: []
narrative_threads: []
`;

function makeUnit(id: string, callsign: string, current_position: [number, number] = [-90.58, 41.52]): Unit {
  return {
    id,
    callsign,
    vehicle_id: `v_${id}`,
    homebase_station_id: "st_a",
    status: "available",
    status_since_game_min: 0,
    current_position,
    crew: [],
  };
}

function bootLobby(): { t1: Shift; t2: Shift } {
  const t1 = parseShift(TIER1_YAML);
  const t2 = parseShift(TIER2_YAML);
  const u1 = makeUnit("u_e1", "E1", [-90.58, 41.52]);
  const u2 = makeUnit("u_m1", "M1", [-90.58, 41.52]);
  useFloor.setState({
    units: new Map([[u1.id, u1], [u2.id, u2]]),
    incidents: new Map(),
    addresses: new Map(),
    stations: new Map(),
    vehicles: new Map(),
    personnel: new Map(),
    callers: new Map(),
    intel: new Map(),
    road_graph: null,
    game_min: 0,
    paused: false,
    speed: 1,
    shift: null,
    shift_id: null,
    shift_status: "idle",
    incidents_spawned: new Set(),
    shift_outcome: null,
    available_shifts: [t1, t2],
    unit_homebases: new Map([[u1.id, u1.current_position], [u2.id, u2.current_position]]),
    last_event_log: [],
    selection: null,
    nav_back: [],
    nav_forward: [],
    // Day 14: tests pre-date career gating. Unlock everything so the
    // existing assertions still pass — gating itself is tested in
    // career.test.ts.
    career_progress: { completed_shift_ids: ["t1", "t2"], last_completed_at: null },
  });
  return { t1, t2 };
}

describe("Day 9 lobby state", () => {
  beforeEach(() => bootLobby());

  it("boots into idle status with available shifts populated", () => {
    const s = useFloor.getState();
    expect(s.shift_status).toBe("idle");
    expect(s.shift).toBeNull();
    expect(s.available_shifts).toHaveLength(2);
  });

  it("`start <shift>` arms the chosen shift and flips status to running", () => {
    const r = executeInput("start t2");
    expect(r.ok).toBe(true);
    const s = useFloor.getState();
    expect(s.shift?.id).toBe("t2");
    expect(s.shift_status).toBe("running");
    expect(s.game_min).toBe(0);
    expect(s.paused).toBe(false);
  });

  it("`start` rejects an unknown shift id", () => {
    const r = executeInput("start nonexistent");
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/unknown shift/);
    expect(useFloor.getState().shift_status).toBe("idle");
  });

  it("`start` rejects when a shift is already running", () => {
    executeInput("start t1");
    const r = executeInput("start t2");
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/already running/);
    // First-armed shift survives the rejected re-arm.
    expect(useFloor.getState().shift?.id).toBe("t1");
  });

  it("`restart` re-arms the current shift, clearing incidents_spawned", () => {
    executeInput("start t1");
    useFloor.getState().markIncidentSpawned("i_01");
    expect(useFloor.getState().incidents_spawned.has("i_01")).toBe(true);
    const r = executeInput("restart");
    expect(r.ok).toBe(true);
    const s = useFloor.getState();
    expect(s.incidents_spawned.size).toBe(0);
    expect(s.game_min).toBe(0);
    expect(s.shift_status).toBe("running");
  });

  it("`restart` rejects when no shift is loaded", () => {
    const r = executeInput("restart");
    expect(r.ok).toBe(false);
  });

  it("`end_shift` flips running → complete and computes an outcome", () => {
    executeInput("start t1");
    const r = executeInput("end_shift");
    expect(r.ok).toBe(true);
    const s = useFloor.getState();
    expect(s.shift_status).toBe("complete");
    expect(s.shift_outcome).not.toBeNull();
    expect(s.paused).toBe(true);
  });

  it("`end_shift` rejects when no shift is running", () => {
    const r = executeInput("end_shift");
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/not running|no shift loaded/);
  });

  it("`lobby` returns to idle and resets units to homebases", () => {
    executeInput("start t1");
    // Move a unit off-homebase to verify the reset.
    const next = new Map(useFloor.getState().units);
    next.set("u_e1", { ...next.get("u_e1")!, current_position: [-90.50, 41.50], status: "en_route" });
    useFloor.setState({ units: next });
    const r = executeInput("lobby");
    expect(r.ok).toBe(true);
    const s = useFloor.getState();
    expect(s.shift_status).toBe("idle");
    expect(s.shift).toBeNull();
    expect(s.incidents.size).toBe(0);
    const e1 = s.units.get("u_e1")!;
    expect(e1.status).toBe("available");
    expect(e1.current_position).toEqual([-90.58, 41.52]);
  });

  it("returnToLobby preserves the available_shifts list (so lobby still works)", () => {
    executeInput("start t1");
    useFloor.getState().returnToLobby();
    const s = useFloor.getState();
    expect(s.available_shifts).toHaveLength(2);
  });
});

describe("Day 14 career gating on start verb", () => {
  beforeEach(() => bootLobby());

  it("locks tier 2 until tier 1 is completed (verb-level rejection)", () => {
    // Wipe progress so nothing is unlocked except tier 1.
    useFloor.setState({ career_progress: { completed_shift_ids: [], last_completed_at: null } });
    const r = executeInput("start t2");
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/locked/);
    expect(useFloor.getState().shift_status).toBe("idle");
  });

  it("allows tier 1 even with no completions", () => {
    useFloor.setState({ career_progress: { completed_shift_ids: [], last_completed_at: null } });
    const r = executeInput("start t1");
    expect(r.ok).toBe(true);
    expect(useFloor.getState().shift_status).toBe("running");
  });

  it("unlocks tier 2 once tier 1 is in completed_shift_ids", () => {
    useFloor.setState({ career_progress: { completed_shift_ids: ["t1"], last_completed_at: "now" } });
    const r = executeInput("start t2");
    expect(r.ok).toBe(true);
    expect(useFloor.getState().shift_status).toBe("running");
  });
});

describe("Day 9 shift-slot suggestions", () => {
  beforeEach(() => bootLobby());

  it("suggestForInput on `start ` lists every available shift with its tier", () => {
    const suggestions = suggestForInput(parseInput("start "));
    expect(suggestions.map((s) => s.token)).toEqual(["t1", "t2"]);
    expect(suggestions[0].trailing).toMatch(/tier 1/);
    expect(suggestions[1].trailing).toMatch(/tier 2/);
  });

  it("partial filter narrows by id", () => {
    const suggestions = suggestForInput(parseInput("start t2"));
    expect(suggestions.map((s) => s.token)).toEqual(["t2"]);
  });
});
