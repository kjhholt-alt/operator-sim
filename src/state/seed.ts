/// <reference types="vite/client" />
/**
 * Operator Sim — boot-time seed.
 *
 * Loads baked OSM addresses for the active city and inserts demo entities
 * (1 station, 3 units, 1 incident) so the floor has something to look at
 * before the dispatch FSM is wired Day 3.
 *
 * Idempotent: safe to call multiple times (clears + re-seeds).
 */

import type { Address, Incident, Station, Unit, Vehicle, Personnel } from "@/lib/schemas";
import { useFloor } from "./useFloor";
import { loadRoadGraph } from "@/sim/roadGraph";

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

function pickFirstReal<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

export async function bootFloor(city = "quad_cities") {
  const [addresses, roadGraph] = await Promise.all([
    loadAddresses(city),
    loadRoadGraph(`${import.meta.env.BASE_URL}data/${city}/roads.geojson`),
  ]);

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

  // 3 units in different states so the legend is meaningful at boot.
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
      status: "en_route",
      status_since_game_min: 1.2,
      current_position: [QC_CENTER[0] - 0.012, QC_CENTER[1] + 0.004],
      crew: ["p_001"],
    },
    {
      id: "u_234",
      callsign: "234",
      vehicle_id: "v_234",
      homebase_station_id: station.id,
      status: "on_scene",
      status_since_game_min: 4.5,
      current_position: [QC_CENTER[0] + 0.005, QC_CENTER[1] - 0.008],
      crew: ["p_002"],
    },
  ];

  // 1 demo incident — sized so the response window shows on the radar.
  const demoIncidentAddress = pickFirstReal(addresses, 5)[2] ?? addresses[0];
  const incident: Incident | null = demoIncidentAddress
    ? {
        id: "i_2031",
        type: "medical_cardiac",
        severity: "high",
        status: "dispatched",
        address_id: demoIncidentAddress.id,
        reported_at_game_min: 4.0,
        resolution_window_game_min: 6,
        dispatched_unit_ids: ["u_m2"],
        shift_id: "shift-day0-demo",
      }
    : null;

  // Hydrate the store wholesale (cleaner than per-row upserts).
  const f = useFloor.getState();
  useFloor.setState({
    addresses: new Map(addresses.map((a) => [a.id, a])),
    stations: new Map([[station.id, station]]),
    vehicles: new Map([[vehicle.id, vehicle]]),
    personnel: new Map(personnel.map((p) => [p.id, p])),
    units: new Map(units.map((u) => [u.id, u])),
    incidents: new Map(incident ? [[incident.id, incident]] : []),
    road_graph: roadGraph,
  });

  const graphSummary = roadGraph
    ? `${roadGraph.nodes.size} nodes`
    : "no road graph";
  f.logEvent(
    `boot — ${addresses.length} addresses, ${units.length} units, ${incident ? 1 : 0} incident, ${graphSummary}`,
  );
}
