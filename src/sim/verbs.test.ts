import { describe, it, expect, beforeEach } from "vitest";
import { useFloor } from "@/state/useFloor";
import {
  applySuggestion,
  executeInput,
  parseInput,
  suggestForInput,
  VERBS,
} from "./verbs";
import { buildRoadGraph } from "./roadGraph";
import type { Address, Incident, Station, Unit, Vehicle } from "@/lib/schemas";

const TINY_ROADS = {
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
        ],
      },
    },
  ],
};

function seed() {
  const station: Station = {
    id: "st_a",
    name: "Test Station",
    agency: "fire",
    address_id: "addr_a",
    built_at: "2026-05-09T00:00:00Z",
    capacity_units: 4,
    capacity_personnel: 24,
  };
  const addrA: Address = {
    id: "addr_a",
    street: "A",
    city: "QC",
    state: "IA",
    coord: [-90.580, 41.520],
  };
  const addrB: Address = {
    id: "addr_b",
    street: "B",
    city: "QC",
    state: "IA",
    coord: [-90.576, 41.520],
  };
  const vehicle: Vehicle = {
    id: "v_e1",
    callsign: "E1",
    class: "engine",
    homebase_station_id: "st_a",
    purchased_at: "2026-05-09T00:00:00Z",
    status: "operational",
    mileage_km: 0,
  };
  const unitA: Unit = {
    id: "u_e1",
    callsign: "E1",
    vehicle_id: "v_e1",
    homebase_station_id: "st_a",
    status: "available",
    status_since_game_min: 0,
    current_position: [-90.580, 41.520],
    crew: [],
  };
  const unitB: Unit = {
    id: "u_m2",
    callsign: "M2",
    vehicle_id: "v_e1",
    homebase_station_id: "st_a",
    status: "en_route",
    status_since_game_min: 0,
    current_position: [-90.580, 41.520],
    crew: [],
  };
  const incidentLive: Incident = {
    id: "i_42",
    type: "medical_cardiac",
    severity: "high",
    status: "queued",
    address_id: "addr_b",
    reported_at_game_min: 0,
    resolution_window_game_min: 2,
    dispatched_unit_ids: [],
    shift_id: "test",
  };
  const incidentDead: Incident = {
    id: "i_99",
    type: "alarm_false",
    severity: "low",
    status: "resolved",
    address_id: "addr_a",
    reported_at_game_min: 0,
    resolution_window_game_min: 1,
    dispatched_unit_ids: [],
    shift_id: "test",
  };
  useFloor.setState({
    units: new Map([[unitA.id, unitA], [unitB.id, unitB]]),
    incidents: new Map([[incidentLive.id, incidentLive], [incidentDead.id, incidentDead]]),
    addresses: new Map([[addrA.id, addrA], [addrB.id, addrB]]),
    stations: new Map([[station.id, station]]),
    vehicles: new Map([[vehicle.id, vehicle]]),
    personnel: new Map(),
    callers: new Map(),
    intel: new Map(),
    road_graph: buildRoadGraph(TINY_ROADS),
    speed: 1,
    paused: false,
    game_min: 0,
    selection: null,
    nav_back: [],
    nav_forward: [],
    last_event_log: [],
  });
}

describe("verb parser", () => {
  it("handles empty input", () => {
    const p = parseInput("");
    expect(p.tokens).toEqual([]);
    expect(p.verb).toBeNull();
    expect(p.active_slot).toBe(-1);
  });

  it("identifies a partial verb token before completion", () => {
    const p = parseInput("dis");
    expect(p.tokens).toEqual(["dis"]);
    expect(p.verb).toBeNull(); // partial
    expect(p.verb_complete).toBe(false);
    expect(p.active_slot).toBe(-1);
  });

  it("identifies a typed verb without trailing space as still editing", () => {
    const p = parseInput("dispatch");
    expect(p.verb?.id).toBe("dispatch");
    expect(p.verb_complete).toBe(false);
    expect(p.active_slot).toBe(-1);
  });

  it("locks the verb on trailing space and points at slot 0", () => {
    const p = parseInput("dispatch ");
    expect(p.verb?.id).toBe("dispatch");
    expect(p.verb_complete).toBe(true);
    expect(p.active_slot).toBe(0);
  });

  it("active_slot tracks which token the cursor is in", () => {
    const p = parseInput("dispatch E1 i_4");
    expect(p.active_slot).toBe(1);
    const p2 = parseInput("dispatch E1 i_42 ");
    expect(p2.active_slot).toBe(2); // beyond defined slots — caller should ignore
  });
});

describe("suggestForInput", () => {
  beforeEach(() => seed());

  it("suggests verbs when nothing typed", () => {
    const list = suggestForInput(parseInput(""));
    expect(list.length).toBe(VERBS.length);
    expect(list[0].token).toBe("dispatch");
  });

  it("filters verbs by partial prefix", () => {
    const list = suggestForInput(parseInput("re"));
    expect(list.find((s) => s.token === "recall")).toBeTruthy();
    expect(list.find((s) => s.token === "dispatch")).toBeFalsy();
  });

  it("suggests only AVAILABLE units for dispatch slot 1", () => {
    const list = suggestForInput(parseInput("dispatch "));
    expect(list.find((s) => s.token === "E1")).toBeTruthy();
    expect(list.find((s) => s.token === "M2")).toBeFalsy(); // en_route filtered
  });

  it("suggests only ACTIVE incidents for dispatch slot 2", () => {
    const list = suggestForInput(parseInput("dispatch E1 "));
    expect(list.find((s) => s.token === "i_42")).toBeTruthy();
    expect(list.find((s) => s.token === "i_99")).toBeFalsy(); // resolved filtered
  });

  it("filters incident suggestions by typed prefix", () => {
    const list = suggestForInput(parseInput("dispatch E1 i_4"));
    expect(list.length).toBe(1);
    expect(list[0].token).toBe("i_42");
  });

  it("suggests speed values for the speed verb", () => {
    const list = suggestForInput(parseInput("speed "));
    expect(list.map((s) => s.token)).toEqual(["0.5", "1", "2", "4"]);
  });

  it("recall slot suggests only NOT-available units", () => {
    const list = suggestForInput(parseInput("recall "));
    expect(list.find((s) => s.token === "M2")).toBeTruthy();
    expect(list.find((s) => s.token === "E1")).toBeFalsy();
  });
});

describe("applySuggestion", () => {
  it("appends a verb token and trailing space when slot remains", () => {
    const r = applySuggestion("disp", { token: "dispatch", display: "dispatch" });
    expect(r.value).toBe("dispatch ");
    expect(r.complete).toBe(false);
  });

  it("marks complete=true for a no-arg verb", () => {
    const r = applySuggestion("pa", { token: "pause", display: "pause" });
    expect(r.complete).toBe(true);
  });

  it("fills slot 1 and adds a space when slot 2 remains", () => {
    const r = applySuggestion("dispatch ", { token: "E1", display: "E1" });
    expect(r.value).toBe("dispatch E1 ");
    expect(r.complete).toBe(false);
  });

  it("fills the final slot without trailing space", () => {
    const r = applySuggestion("dispatch E1 ", { token: "i_42", display: "i_42" });
    expect(r.value).toBe("dispatch E1 i_42");
    expect(r.complete).toBe(true);
  });

  it("replaces a partial argument token", () => {
    const r = applySuggestion("dispatch E1 i_4", { token: "i_42", display: "i_42" });
    expect(r.value).toBe("dispatch E1 i_42");
  });
});

describe("executeInput", () => {
  beforeEach(() => seed());

  it("rejects empty / unknown verbs", () => {
    expect(executeInput("").ok).toBe(false);
    const r = executeInput("nonsense");
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/unknown verb/);
  });

  it("rejects with a clear missing-slot error", () => {
    const r = executeInput("dispatch E1");
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/missing incident/);
  });

  it("runs dispatch end-to-end", () => {
    const r = executeInput("dispatch E1 i_42");
    expect(r.ok).toBe(true);
    const u = useFloor.getState().units.get("u_e1")!;
    expect(u.status).toBe("en_route");
  });

  it("runs the no-arg pause verb", () => {
    const before = useFloor.getState().paused;
    const r = executeInput("pause");
    expect(r.ok).toBe(true);
    expect(useFloor.getState().paused).toBe(!before);
  });

  it("runs speed with literal slot", () => {
    const r = executeInput("speed 2");
    expect(r.ok).toBe(true);
    expect(useFloor.getState().speed).toBe(2);
  });

  it("rejects invalid speed values", () => {
    const r = executeInput("speed 7");
    expect(r.ok).toBe(false);
  });
});
