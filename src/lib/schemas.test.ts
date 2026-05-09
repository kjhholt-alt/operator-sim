import { describe, it, expect } from "vitest";
import {
  Unit,
  Incident,
  Shift,
  IncidentType,
  UnitStatus,
} from "./schemas";

describe("entity schemas", () => {
  it("validates a minimal Unit", () => {
    const result = Unit.safeParse({
      id: "u_e1",
      callsign: "E1",
      vehicle_id: "v_engine_001",
      homebase_station_id: "st_central",
      status: "available",
      status_since_game_min: 0,
      current_position: [-90.5776, 41.5236],
      crew: ["p_001", "p_002", "p_003", "p_004"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects bad UnitStatus", () => {
    const result = UnitStatus.safeParse("driving");
    expect(result.success).toBe(false);
  });

  it("validates a minimal Incident", () => {
    const result = Incident.safeParse({
      id: "i_2031",
      type: "medical_cardiac",
      severity: "high",
      status: "queued",
      address_id: "addr_1421_brady",
      reported_at_game_min: 4.5,
      resolution_window_game_min: 6,
      shift_id: "shift-001",
    });
    expect(result.success).toBe(true);
  });

  it("validates a minimal Shift document", () => {
    const result = Shift.safeParse({
      id: "shift-001",
      date: "2026-05-12",
      difficulty_tier: 1,
      length_game_min: 12,
      incidents: [
        {
          id: "i_2031",
          spawn_time_game_min: 4,
          type: "medical_cardiac" as const,
          address: "1421 Brady St, Davenport IA",
          resolution_window_game_min: 6,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an incident type that isn't in the registry", () => {
    const result = IncidentType.safeParse("alien_invasion");
    expect(result.success).toBe(false);
  });
});
