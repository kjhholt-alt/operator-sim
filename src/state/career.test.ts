/**
 * Day 14 — career progress gating logic.
 *
 * Pure tests on computeUnlockedShifts + setCareerProgress action. Dexie
 * writes are exercised in-browser; no IndexedDB in vitest's jsdom env.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { computeUnlockedShifts } from "./career";
import { useFloor } from "./useFloor";

const shifts = [
  { id: "qc_tier1_001", difficulty_tier: 1 },
  { id: "qc_tier2_001", difficulty_tier: 2 },
  { id: "qc_police_001", difficulty_tier: 2 },
  { id: "qc_tier3_001", difficulty_tier: 3 },
];

describe("computeUnlockedShifts", () => {
  it("unlocks tier 1 with empty progress", () => {
    const unlocked = computeUnlockedShifts(shifts, []);
    expect(unlocked.has("qc_tier1_001")).toBe(true);
    expect(unlocked.has("qc_tier2_001")).toBe(false);
  });

  it("keeps tier 2+ locked until tier 1 is cleared", () => {
    const unlocked = computeUnlockedShifts(shifts, []);
    expect(unlocked.has("qc_tier2_001")).toBe(false);
    expect(unlocked.has("qc_police_001")).toBe(false);
    expect(unlocked.has("qc_tier3_001")).toBe(false);
  });

  it("unlocks all of tier 2 once tier 1 clears (parallel tier)", () => {
    const unlocked = computeUnlockedShifts(shifts, ["qc_tier1_001"]);
    expect(unlocked.has("qc_tier2_001")).toBe(true);
    expect(unlocked.has("qc_police_001")).toBe(true);
    expect(unlocked.has("qc_tier3_001")).toBe(false);
  });

  it("requires the whole tier-2 row to clear before tier 3 unlocks", () => {
    const justOne = computeUnlockedShifts(shifts, ["qc_tier1_001", "qc_tier2_001"]);
    expect(justOne.has("qc_tier3_001")).toBe(false);
    const both = computeUnlockedShifts(shifts, ["qc_tier1_001", "qc_tier2_001", "qc_police_001"]);
    expect(both.has("qc_tier3_001")).toBe(true);
  });

  it("a fully cleared career unlocks every shift", () => {
    const all = computeUnlockedShifts(shifts, shifts.map((s) => s.id));
    expect(all.size).toBe(shifts.length);
  });
});

describe("setCareerProgress action", () => {
  beforeEach(() => {
    useFloor.setState({ career_progress: { completed_shift_ids: [], last_completed_at: null } });
  });

  it("replaces the progress snapshot wholesale", () => {
    useFloor.getState().setCareerProgress({
      completed_shift_ids: ["qc_tier1_001", "qc_tier2_001"],
      last_completed_at: "2026-05-09T20:00:00Z",
    });
    const p = useFloor.getState().career_progress;
    expect(p.completed_shift_ids).toEqual(["qc_tier1_001", "qc_tier2_001"]);
    expect(p.last_completed_at).toBe("2026-05-09T20:00:00Z");
  });

  it("copies the array (mutations on the input don't leak)", () => {
    const input = ["qc_tier1_001"];
    useFloor.getState().setCareerProgress({ completed_shift_ids: input, last_completed_at: null });
    input.push("trickery");
    expect(useFloor.getState().career_progress.completed_shift_ids).toEqual(["qc_tier1_001"]);
  });
});
