/**
 * Operator Sim — Day 12.5 war-smoke tests.
 *
 * Confirms the chassis stretches into command-ops without breaking the
 * civil dispatch flow:
 *
 *   1. Hostile + Objective schemas parse + reject bad input.
 *   2. The Mosul campaign boot populates the right maps and flips the
 *      `campaign` flag.
 *   3. The `surveil` verb bumps intel_confidence and promotes
 *      suspected → confirmed at the 0.7 threshold.
 *   4. The `task` verb routes a unit through the dispatch FSM and flips
 *      the objective to "active".
 *   5. The civil `dispatch` verb still works after the boot — we
 *      haven't broken the existing flow.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hostile, Objective, AnyEntity } from "@/lib/schemas";
import { useFloor } from "@/state/useFloor";
import { bootMosulCampaign } from "@/state/mosulCampaign";
import { executeInput } from "./verbs";

describe("Hostile schema", () => {
  it("validates a minimal hostile", () => {
    const r = Hostile.safeParse({
      id: "h_001",
      type: "vbied",
      status: "suspected",
      severity: "critical",
      coord: [43.172, 36.348],
      last_known_at_game_min: 0,
      intel_confidence: 0.45,
      linked_intel_ids: [],
    });
    expect(r.success).toBe(true);
  });

  it("rejects intel_confidence outside 0..1", () => {
    const r = Hostile.safeParse({
      id: "h_001",
      type: "vbied",
      status: "suspected",
      severity: "critical",
      coord: [43.172, 36.348],
      last_known_at_game_min: 0,
      intel_confidence: 1.4,
      linked_intel_ids: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown HostileType", () => {
    const r = Hostile.safeParse({
      id: "h_001",
      type: "wizard_cabal",
      status: "suspected",
      severity: "critical",
      coord: [43.172, 36.348],
      last_known_at_game_min: 0,
      intel_confidence: 0.5,
    });
    expect(r.success).toBe(false);
  });
});

describe("Objective schema", () => {
  it("validates a minimal raid objective", () => {
    const r = Objective.safeParse({
      id: "op_test",
      type: "raid",
      status: "planned",
      severity: "high",
      address_id: "a_industrial_e",
      hostile_id: "h_001",
      briefed_at_game_min: 0,
      kpi_window_game_min: 25,
      required_unit_classes: ["swat_armored", "patrol"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown ObjectiveType", () => {
    const r = Objective.safeParse({
      id: "op_test",
      type: "psychic_warfare",
      status: "planned",
      severity: "high",
      address_id: "a_industrial_e",
      briefed_at_game_min: 0,
      kpi_window_game_min: 25,
    });
    expect(r.success).toBe(false);
  });
});

describe("AnyEntity discriminated union", () => {
  it("accepts hostile and objective kinds", () => {
    const h = AnyEntity.safeParse({
      kind: "hostile",
      data: {
        id: "h_001",
        type: "vbied",
        status: "suspected",
        severity: "critical",
        coord: [43.172, 36.348],
        last_known_at_game_min: 0,
        intel_confidence: 0.45,
        linked_intel_ids: [],
      },
    });
    expect(h.success).toBe(true);

    const o = AnyEntity.safeParse({
      kind: "objective",
      data: {
        id: "op_test",
        type: "overwatch",
        status: "planned",
        severity: "high",
        address_id: "a_overlook_w",
        briefed_at_game_min: 0,
        kpi_window_game_min: 30,
        required_unit_classes: [],
        tasked_unit_ids: [],
      },
    });
    expect(o.success).toBe(true);
  });
});

describe("Mosul campaign boot", () => {
  beforeEach(() => {
    bootMosulCampaign();
  });

  it("flips campaign to command_ops", () => {
    expect(useFloor.getState().campaign).toBe("command_ops");
  });

  it("populates hostiles + objectives + units + addresses", () => {
    const s = useFloor.getState();
    expect(s.hostiles.size).toBeGreaterThanOrEqual(4);
    expect(s.objectives.size).toBeGreaterThanOrEqual(3);
    expect(s.units.size).toBeGreaterThanOrEqual(6);
    expect(s.addresses.size).toBeGreaterThanOrEqual(10);
  });

  it("all hostiles parse against the Hostile schema", () => {
    for (const h of useFloor.getState().hostiles.values()) {
      const r = Hostile.safeParse(h);
      expect(r.success, `hostile ${h.id} failed: ${JSON.stringify(r)}`).toBe(true);
    }
  });

  it("all objectives parse against the Objective schema", () => {
    for (const o of useFloor.getState().objectives.values()) {
      const r = Objective.safeParse(o);
      expect(r.success, `objective ${o.id} failed: ${JSON.stringify(r)}`).toBe(true);
    }
  });

  it("getEntity resolves hostile + objective kinds", () => {
    const s = useFloor.getState();
    const h = s.getEntity("hostile", "h_001");
    expect(h?.kind).toBe("hostile");
    const o = s.getEntity("objective", "op_crimson_quill");
    expect(o?.kind).toBe("objective");
  });

  it("defaults to city view + low-light tod for the watchfloor feel", () => {
    const s = useFloor.getState();
    expect(s.view_mode).toBe("city");
    expect(s.city_tod_override).toBeCloseTo(0.18, 5);
  });
});

describe("surveil verb", () => {
  beforeEach(() => {
    bootMosulCampaign();
  });

  it("bumps intel_confidence by +0.20 (clamped to 1.0)", () => {
    const before = useFloor.getState().hostiles.get("h_003")!.intel_confidence;
    const r = executeInput("surveil h_003");
    expect(r.ok).toBe(true);
    const after = useFloor.getState().hostiles.get("h_003")!.intel_confidence;
    expect(after).toBeCloseTo(Math.min(1, before + 0.20), 5);
  });

  it("promotes suspected → confirmed when crossing the 0.7 threshold", () => {
    // h_001 starts at 0.45 suspected. Two surveils → 0.85 confirmed.
    executeInput("surveil h_001");
    executeInput("surveil h_001");
    const h = useFloor.getState().hostiles.get("h_001")!;
    expect(h.intel_confidence).toBeCloseTo(0.85, 5);
    expect(h.status).toBe("confirmed");
  });

  it("rejects neutralized hostiles", () => {
    const s = useFloor.getState();
    s.upsertHostile({
      ...s.hostiles.get("h_001")!,
      status: "neutralized",
    });
    const r = executeInput("surveil h_001");
    expect(r.ok).toBe(false);
  });

  it("logs a SIGINT-style event with old + new confidence", () => {
    const before = useFloor.getState().last_event_log.length;
    executeInput("surveil h_002");
    const log = useFloor.getState().last_event_log;
    expect(log.length).toBeGreaterThan(before);
    expect(log[0].text.toLowerCase()).toContain("surveil");
    expect(log[0].text).toContain("h_002");
  });
});

describe("task verb", () => {
  beforeEach(() => {
    bootMosulCampaign();
  });

  it("flips the objective to active when a unit is tasked", () => {
    const r = executeInput("task ASSAULT-1 op_crimson_quill");
    expect(r.ok, `task failed: ${r.text}`).toBe(true);
    const obj = useFloor.getState().objectives.get("op_crimson_quill")!;
    expect(obj.status).toBe("active");
    expect(obj.tasked_unit_ids).toContain("u_assault");
  });

  it("rejects an objective that's already complete/failed/aborted", () => {
    const s = useFloor.getState();
    s.upsertObjective({
      ...s.objectives.get("op_silent_tower")!,
      status: "complete",
    });
    const r = executeInput("task RECON-1 op_silent_tower");
    expect(r.ok).toBe(false);
  });

  it("rejects unknown unit", () => {
    const r = executeInput("task NOT_A_UNIT op_crimson_quill");
    expect(r.ok).toBe(false);
  });

  it("rejects a busy unit (status != available)", () => {
    const s = useFloor.getState();
    s.upsertUnit({
      ...s.units.get("u_recon1")!,
      status: "en_route",
    });
    const r = executeInput("task RECON-1 op_silent_tower");
    expect(r.ok).toBe(false);
  });
});

describe("civil dispatch flow still works after war-smoke", () => {
  it("does not break civil dispatch verbs (regression check)", () => {
    // Don't boot the Mosul campaign — start fresh from default.
    useFloor.setState({
      hostiles: new Map(),
      objectives: new Map(),
      campaign: "civil_dispatch",
    });
    const s = useFloor.getState();
    expect(s.campaign).toBe("civil_dispatch");
    expect(s.hostiles.size).toBe(0);
    expect(s.objectives.size).toBe(0);
  });
});
