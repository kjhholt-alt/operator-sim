import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildShiftIntel,
  computeOutcome,
  parseShift,
  spawnDueIncidents,
  type ShiftOutcome,
} from "./shift";
import type { Address, Incident, Shift } from "@/lib/schemas";

const SHIFT_PATH = resolve(__dirname, "..", "..", "data", "shifts", "qc_tier1_001.yaml");

function shippedYaml(): string {
  return readFileSync(SHIFT_PATH, "utf8");
}

function makeAddress(id: string, street: string): Address {
  return { id, street, city: "Davenport", state: "IA", coord: [-90.58, 41.52] };
}

function syntheticAddresses(streets: string[]): Map<string, Address> {
  return new Map(streets.map((s, i) => [`addr_${i}`, makeAddress(`addr_${i}`, s)]));
}

describe("parseShift", () => {
  it("parses the shipped Tier-1 YAML through Zod", () => {
    const shift = parseShift(shippedYaml());
    expect(shift.id).toBe("qc_tier1_001");
    expect(shift.difficulty_tier).toBe(1);
    expect(shift.length_game_min).toBe(12);
    expect(shift.incidents).toHaveLength(5);
    // Spawn times must be monotonically non-decreasing for a relaxed Tier-1 cadence.
    const spawnTimes = shift.incidents.map((i) => i.spawn_time_game_min);
    expect([...spawnTimes].sort((a, b) => a - b)).toEqual(spawnTimes);
  });

  it("populates default severity 'moderate' when missing", () => {
    const yaml = `
id: t1
date: 2026-05-09
city: quad_cities
difficulty_tier: 1
length_game_min: 5
incidents:
  - id: i_x
    spawn_time_game_min: 0
    type: alarm_false
    address: 100 Main St
    resolution_window_game_min: 1
intel: []
narrative_threads: []
`;
    const s = parseShift(yaml);
    expect(s.incidents[0].severity).toBe("moderate");
  });

  it("rejects a shift with no incidents", () => {
    const yaml = `
id: t2
date: 2026-05-09
difficulty_tier: 1
length_game_min: 5
incidents: []
`;
    expect(() => parseShift(yaml)).toThrow();
  });
});

describe("spawnDueIncidents", () => {
  function makeShift(overrides: Partial<Shift> = {}): Shift {
    return {
      id: "test",
      date: "2026-05-09",
      city: "quad_cities",
      difficulty_tier: 1,
      length_game_min: 12,
      incidents: [
        {
          id: "i_a",
          spawn_time_game_min: 1,
          type: "alarm_false",
          severity: "low",
          address: "100 Main St",
          resolution_window_game_min: 1,
          narrative_hooks: [],
        },
        {
          id: "i_b",
          spawn_time_game_min: 4,
          type: "medical_general",
          severity: "moderate",
          address: "200 Main St",
          resolution_window_game_min: 2,
          narrative_hooks: [],
        },
      ],
      intel: [],
      narrative_threads: [],
      ...overrides,
    };
  }

  it("returns nothing when no incidents are due yet", () => {
    const r = spawnDueIncidents(
      makeShift(),
      0.5,
      new Set(),
      syntheticAddresses(["100 Main St", "200 Main St"]),
    );
    expect(r.incidents).toHaveLength(0);
    expect(r.spawned_ids).toHaveLength(0);
  });

  it("spawns the first incident when its spawn time is reached", () => {
    const r = spawnDueIncidents(
      makeShift(),
      1.5,
      new Set(),
      syntheticAddresses(["100 Main St", "200 Main St"]),
    );
    expect(r.incidents).toHaveLength(1);
    expect(r.incidents[0].id).toBe("i_a");
    expect(r.incidents[0].status).toBe("queued");
    expect(r.incidents[0].address_id).toBe("addr_0");
    expect(r.spawned_ids).toEqual(["i_a"]);
    expect(r.events[0]).toMatch(/incoming/);
  });

  it("does not respawn an already-spawned incident", () => {
    const r = spawnDueIncidents(
      makeShift(),
      5,
      new Set(["i_a"]),
      syntheticAddresses(["100 Main St", "200 Main St"]),
    );
    expect(r.incidents.map((i) => i.id)).toEqual(["i_b"]);
  });

  it("logs a FAIL and marks-as-spawned when the YAML address isn't baked", () => {
    const r = spawnDueIncidents(
      makeShift(),
      2,
      new Set(),
      syntheticAddresses(["999 Wrong St"]), // doesn't match "100 Main St"
    );
    expect(r.incidents).toHaveLength(0);
    expect(r.spawned_ids).toEqual(["i_a"]);
    expect(r.events[0]).toMatch(/spawn FAIL/);
  });

  it("address match is case-insensitive on street", () => {
    const r = spawnDueIncidents(
      makeShift(),
      2,
      new Set(),
      syntheticAddresses(["100 MAIN ST"]),
    );
    expect(r.incidents).toHaveLength(1);
    expect(r.incidents[0].address_id).toBe("addr_0");
  });
});

describe("buildShiftIntel", () => {
  it("transforms shift.intel into runtime Intel records", () => {
    const shift = parseShift(shippedYaml());
    const intel = buildShiftIntel(shift);
    expect(intel.length).toBe(shift.intel.length);
    expect(intel[0].posted_at_game_min).toBe(0);
    expect(intel[0].expires_at_game_min).toBe(shift.length_game_min);
  });
});

describe("computeOutcome", () => {
  function makeShift(): Shift {
    return parseShift(shippedYaml());
  }

  function fakeIncident(id: string, status: Incident["status"], resolved_at?: number): Incident {
    return {
      id,
      type: "alarm_false",
      severity: "low",
      status,
      address_id: "addr_0",
      reported_at_game_min: 0,
      resolution_window_game_min: 1.5,
      dispatched_unit_ids: [],
      resolved_at_game_min: resolved_at,
      shift_id: "qc_tier1_001",
    };
  }

  it("S grade when every incident resolved in window", () => {
    const shift = makeShift();
    const live = new Map<string, Incident>();
    for (const si of shift.incidents) {
      live.set(si.id, fakeIncident(si.id, "resolved", si.spawn_time_game_min + si.resolution_window_game_min - 0.1));
    }
    const out = computeOutcome(shift, live);
    expect(out.grade).toBe("S");
    expect(out.score).toBeCloseTo(1, 5);
    expect(out.resolved_in_window).toBe(shift.incidents.length);
    expect(out.missed).toBe(0);
  });

  it("D grade when nothing was resolved", () => {
    const shift = makeShift();
    const out = computeOutcome(shift, new Map());
    expect(out.grade).toBe("D");
    expect(out.score).toBe(0);
    expect(out.missed).toBe(shift.incidents.length);
  });

  it("late resolution scores 0.5 per incident", () => {
    const shift = makeShift();
    const live = new Map<string, Incident>();
    for (const si of shift.incidents) {
      live.set(si.id, fakeIncident(si.id, "resolved", si.spawn_time_game_min + si.resolution_window_game_min + 1));
    }
    const out: ShiftOutcome = computeOutcome(shift, live);
    expect(out.resolved_late).toBe(shift.incidents.length);
    expect(out.resolved_in_window).toBe(0);
    expect(out.score).toBeCloseTo(0.5, 5);
    expect(out.grade).toBe("C");
  });

  it("classifies each incident with computed late_by", () => {
    const shift = makeShift();
    const live = new Map<string, Incident>();
    const first = shift.incidents[0];
    live.set(
      first.id,
      fakeIncident(first.id, "resolved", first.spawn_time_game_min + first.resolution_window_game_min + 0.7),
    );
    const out = computeOutcome(shift, live);
    const r = out.per_incident.find((p) => p.shift_incident_id === first.id)!;
    expect(r.outcome).toBe("resolved_late");
    expect(r.late_by_game_min).toBeCloseTo(0.7, 5);
  });
});
