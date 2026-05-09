import { describe, it, expect, beforeEach } from "vitest";
import { useFloor } from "./useFloor";

describe("selection history", () => {
  beforeEach(() => {
    useFloor.setState({
      selection: null,
      nav_back: [],
      nav_forward: [],
    });
  });

  it("starts empty with no back / forward", () => {
    const s = useFloor.getState();
    expect(s.selection).toBeNull();
    expect(s.nav_back).toHaveLength(0);
    expect(s.nav_forward).toHaveLength(0);
  });

  it("select pushes the previous selection onto nav_back", () => {
    const { select } = useFloor.getState();
    select({ kind: "unit", id: "u_1" });
    expect(useFloor.getState().nav_back).toHaveLength(0); // first selection has no prev
    select({ kind: "incident", id: "i_2" });
    const s = useFloor.getState();
    expect(s.selection).toEqual({ kind: "incident", id: "i_2" });
    expect(s.nav_back).toHaveLength(1);
    expect(s.nav_back[0]).toEqual({ kind: "unit", id: "u_1" });
  });

  it("repeated select of the same entity is a no-op (no history churn)", () => {
    const { select } = useFloor.getState();
    select({ kind: "unit", id: "u_1" });
    select({ kind: "unit", id: "u_1" });
    select({ kind: "unit", id: "u_1" });
    expect(useFloor.getState().nav_back).toHaveLength(0);
  });

  it("goBack pops nav_back and pushes current onto nav_forward", () => {
    const s = useFloor.getState();
    s.select({ kind: "unit", id: "u_1" });
    s.select({ kind: "incident", id: "i_2" });
    s.goBack();
    const after = useFloor.getState();
    expect(after.selection).toEqual({ kind: "unit", id: "u_1" });
    expect(after.nav_back).toHaveLength(0);
    expect(after.nav_forward).toHaveLength(1);
    expect(after.nav_forward[0]).toEqual({ kind: "incident", id: "i_2" });
  });

  it("goForward redoes a back step", () => {
    const s = useFloor.getState();
    s.select({ kind: "unit", id: "u_1" });
    s.select({ kind: "incident", id: "i_2" });
    s.goBack();
    s.goForward();
    const after = useFloor.getState();
    expect(after.selection).toEqual({ kind: "incident", id: "i_2" });
    expect(after.nav_back).toHaveLength(1);
    expect(after.nav_forward).toHaveLength(0);
  });

  it("a fresh select after goBack clears nav_forward", () => {
    const s = useFloor.getState();
    s.select({ kind: "unit", id: "u_1" });
    s.select({ kind: "incident", id: "i_2" });
    s.goBack();
    s.select({ kind: "station", id: "st_a" }); // diverges
    const after = useFloor.getState();
    expect(after.selection).toEqual({ kind: "station", id: "st_a" });
    expect(after.nav_forward).toHaveLength(0);
  });

  it("goBack on empty history is a no-op", () => {
    const before = useFloor.getState();
    before.goBack();
    const after = useFloor.getState();
    expect(after.selection).toBeNull();
    expect(after.nav_back).toHaveLength(0);
  });

  it("nav_back is capped at 50 entries", () => {
    const { select } = useFloor.getState();
    for (let i = 0; i < 75; i++) {
      select({ kind: "unit", id: `u_${i}` });
    }
    expect(useFloor.getState().nav_back.length).toBeLessThanOrEqual(50);
  });

  it("clearNav wipes everything", () => {
    const s = useFloor.getState();
    s.select({ kind: "unit", id: "u_1" });
    s.select({ kind: "incident", id: "i_2" });
    s.clearNav();
    const after = useFloor.getState();
    expect(after.selection).toBeNull();
    expect(after.nav_back).toHaveLength(0);
    expect(after.nav_forward).toHaveLength(0);
  });
});
