/// <reference types="vite/client" />
/**
 * Operator Sim — boot-time seed.
 *
 * Day 6: hydrates the floor with the baked OSM dataset (addresses, road graph)
 * + the static roster (1 station, 3 units, 4 personnel) and arms the Tier-1
 * shift driver. Live incidents are NOT seeded — they spawn from the YAML's
 * spawn timeline as game time advances.
 *
 * Idempotent: safe to call multiple times (clears + re-seeds).
 */

import type { Address, Caller, Station, Unit, Vehicle, Personnel } from "@/lib/schemas";
import { useFloor } from "./useFloor";
import { loadRoadGraph } from "@/sim/roadGraph";
import { buildShiftIntel, parseShift } from "@/sim/shift";
// Vite `?raw` import → bundle the YAML at build time. Keeps the player from
// having to fetch /data/shifts/* at runtime and lets us ship the shift inside
// the SPA bundle.
import qcTier1Yaml from "../../data/shifts/qc_tier1_001.yaml?raw";

const QC_CENTER: [number, number] = [-90.5776, 41.5236];

interface BakedAddress {
  id: string;
  street: string;
  city: string | null;
  state: string | null;
  postal: string | null;
  coord: [number, number];
}

async function loadAddresses(city: string): Promise<Address[]> {
  const url = `${import.meta.env.BASE_URL}data/${city}/addresses.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[seed] addresses fetch ${res.status} for ${url} — proceeding with empty set`);
      return [];
    }
    const baked: BakedAddress[] = await res.json();
    return baked.map((a) => ({
      id: a.id,
      street: a.street,
      city: a.city ?? "Davenport",
      state: a.state ?? "IA",
      postal: a.postal ?? undefined,
      coord: a.coord,
    }));
  } catch (err) {
    console.warn("[seed] address load failed", err);
    return [];
  }
}

export async function bootFloor(city = "quad_cities") {
  const [addresses, roadGraph] = await Promise.all([
    loadAddresses(city),
    loadRoadGraph(`${import.meta.env.BASE_URL}data/${city}/roads.geojson`),
  ]);

  // Day 6: parse the shipped Tier-1 shift YAML (Zod-validated). Shift incidents
  // are NOT pushed into the live `incidents` Map at boot — they wait in the
  // shift's spawn timeline and arrive on tick when game_min ≥ spawn_time.
  const shift = parseShift(qcTier1Yaml);
  const shiftIntel = buildShiftIntel(shift);

  // 1 station @ QC center (Davenport core).
  const station: Station = {
    id: "st_central",
    name: "Davenport Central",
    agency: "fire",
    address_id: addresses[0]?.id ?? "synthetic_st_central",
    built_at: "2026-05-09T00:00:00Z",
    capacity_units: 4,
    capacity_personnel: 24,
  };

  // 1 vehicle.
  const vehicle: Vehicle = {
    id: "v_e1",
    callsign: "E1",
    class: "engine",
    homebase_station_id: station.id,
    purchased_at: "2026-05-09T00:00:00Z",
    status: "operational",
    mileage_km: 0,
  };

  // 4 firefighters.
  const personnel: Personnel[] = [
    { id: "p_001", name: "Lt. Diaz",   role: "lieutenant",   homebase_station_id: station.id, hire_date: "2026-03-12T00:00:00Z", skills: ["paramedic"], schedule_template: "standard", active: true },
    { id: "p_002", name: "FF Hong",    role: "firefighter",  homebase_station_id: station.id, hire_date: "2026-03-15T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_003", name: "FF Patel",   role: "firefighter",  homebase_station_id: station.id, hire_date: "2026-04-02T00:00:00Z", skills: ["hazmat"], schedule_template: "standard", active: true },
    { id: "p_004", name: "FF Walker",  role: "firefighter",  homebase_station_id: station.id, hire_date: "2026-04-18T00:00:00Z", skills: [], schedule_template: "standard", active: true },
  ];

  // 3 units, all available at shift start. The Tier-1 shift only spawns 5
  // incidents over 12 game-min, so a single dispatcher with 3 units has
  // comfortable slack for the relaxed pacing.
  const units: Unit[] = [
    {
      id: "u_e1",
      callsign: "E1",
      vehicle_id: vehicle.id,
      homebase_station_id: station.id,
      status: "available",
      status_since_game_min: 0,
      current_position: QC_CENTER,
      crew: ["p_001", "p_002", "p_003", "p_004"],
    },
    {
      id: "u_m2",
      callsign: "M2",
      vehicle_id: "v_m2",
      homebase_station_id: station.id,
      status: "available",
      status_since_game_min: 0,
      current_position: QC_CENTER,
      crew: ["p_001"],
    },
    {
      id: "u_234",
      callsign: "234",
      vehicle_id: "v_234",
      homebase_station_id: station.id,
      status: "available",
      status_since_game_min: 0,
      current_position: QC_CENTER,
      crew: ["p_002"],
    },
  ];

  // 1 demo caller — kept so the right-rail drill-down has prior data to
  // wander into, even though the shift's spawned incidents won't link to it.
  const caller: Caller = {
    id: "c_margaret_k",
    display: "Margaret K., 67yo female",
    phone: "+1 563 555 0142",
    address_id: addresses[0]?.id,
    prior_incidents: [],
    notes: "Repeat caller, cardiac history. Lives alone. Daughter on speed-dial.",
  };

  // Hydrate the store wholesale (cleaner than per-row upserts).
  const f = useFloor.getState();
  useFloor.setState({
    addresses: new Map(addresses.map((a) => [a.id, a])),
    stations: new Map([[station.id, station]]),
    vehicles: new Map([[vehicle.id, vehicle]]),
    personnel: new Map(personnel.map((p) => [p.id, p])),
    units: new Map(units.map((u) => [u.id, u])),
    incidents: new Map(),
    callers: new Map([[caller.id, caller]]),
    intel: new Map(shiftIntel.map((it) => [it.id, it])),
    road_graph: roadGraph,
    game_min: 0,
  });

  // Day 6: arm the shift driver. Once `loadShift` flips status to "running",
  // `spawnDueIncidents` will start firing in the tick loop.
  f.loadShift(shift);

  const graphSummary = roadGraph
    ? `${roadGraph.nodes.size} nodes`
    : "no road graph";
  f.logEvent(
    `boot — shift ${shift.id} (tier ${shift.difficulty_tier}, ${shift.length_game_min} min, ${shift.incidents.length} incidents) loaded · ${addresses.length} addrs · ${graphSummary}`,
  );
}
