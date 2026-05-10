/// <reference types="vite/client" />
/**
 * Operator Sim — boot-time seed.
 *
 * Day 9: hydrates the floor with the baked OSM dataset (addresses, road
 * graph) + the static roster (1 station, 4 units, 6 personnel), then loads
 * every shipped shift YAML into `available_shifts`. The game boots into the
 * **lobby** (shift_status = "idle") — the player picks Tier 1 or Tier 2 from
 * the ShiftLobby panel, which calls `loadShift(...)` and the timeline starts.
 *
 * Idempotent: safe to call multiple times (clears + re-seeds).
 */

import type { Address, Caller, Coord, Station, Unit, Vehicle, Personnel } from "@/lib/schemas";
import { useFloor } from "./useFloor";
import { loadRoadGraph } from "@/sim/roadGraph";
import { parseShift } from "@/sim/shift";
import { bootMosulCampaign, detectCampaignFromUrl } from "./mosulCampaign";
// Vite `?raw` imports → bundle each YAML at build time. SPA-only; no runtime
// fetch needed.
import qcTier1Yaml from "../../data/shifts/qc_tier1_001.yaml?raw";
import qcTier2Yaml from "../../data/shifts/qc_tier2_001.yaml?raw";
import qcTier3Yaml from "../../data/shifts/qc_tier3_001.yaml?raw";

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
  // Day 12.5 (war-smoke): if ?campaign=mosul (or command_ops/war) is set
  // in the URL, take the command-ops branch entirely. We don't merge —
  // it's a different scenario, different roster, different ontology.
  if (detectCampaignFromUrl() === "command_ops") {
    bootMosulCampaign();
    return;
  }

  const [addresses, roadGraph] = await Promise.all([
    loadAddresses(city),
    loadRoadGraph(`${import.meta.env.BASE_URL}data/${city}/roads.geojson`),
  ]);

  // Day 9: parse every shipped shift YAML (Zod-validated). They go into
  // `available_shifts` for the lobby; only the one the player picks gets
  // armed (loadShift) and starts the spawn timeline.
  const shifts = [parseShift(qcTier1Yaml), parseShift(qcTier2Yaml), parseShift(qcTier3Yaml)];

  // Day 10: two stations across the QC sector. Davenport Central anchors
  // downtown (E1+L1 fire, M1 ambulance, P1 patrol). Davenport East covers
  // the residential corridor to the east (E2 fire, M2 ambulance).
  const stations: Station[] = [
    {
      id: "st_central",
      name: "Davenport Central",
      agency: "fire",
      address_id: addresses[0]?.id ?? "synthetic_st_central",
      built_at: "2026-05-09T00:00:00Z",
      capacity_units: 4,
      capacity_personnel: 24,
    },
    {
      id: "st_east",
      name: "Davenport East",
      agency: "fire",
      address_id: addresses[10]?.id ?? addresses[0]?.id ?? "synthetic_st_east",
      built_at: "2026-05-09T00:00:00Z",
      capacity_units: 3,
      capacity_personnel: 16,
    },
  ];
  const stCentral = stations[0];
  const stEast = stations[1];
  const stEastCoord: [number, number] =
    addresses.find((a) => a.id === stEast.address_id)?.coord ??
    [QC_CENTER[0] + 0.025, QC_CENTER[1] + 0.005];

  // Day 10: 6 units across 2 stations. Central has full coverage; East has
  // engine + ambulance. Closest-unit auto-pick (`assign <incident>`) is now
  // meaningful since the same incident can be answered from either station.
  const vehicles: Vehicle[] = [
    { id: "v_e1",  callsign: "E1",  class: "engine",        homebase_station_id: stCentral.id, purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_l1",  callsign: "L1",  class: "ladder",        homebase_station_id: stCentral.id, purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_m1",  callsign: "M1",  class: "ambulance_als", homebase_station_id: stCentral.id, purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_p1",  callsign: "P1",  class: "patrol",        homebase_station_id: stCentral.id, purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_e2",  callsign: "E2",  class: "engine",        homebase_station_id: stEast.id,    purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_m2",  callsign: "M2",  class: "ambulance_als", homebase_station_id: stEast.id,    purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
  ];

  // 9 personnel — enough to crew all 6 units (single shift).
  const personnel: Personnel[] = [
    { id: "p_001", name: "Lt. Diaz",     role: "lieutenant",  homebase_station_id: stCentral.id, hire_date: "2026-03-12T00:00:00Z", skills: ["paramedic"], schedule_template: "standard", active: true },
    { id: "p_002", name: "FF Hong",      role: "firefighter", homebase_station_id: stCentral.id, hire_date: "2026-03-15T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_003", name: "FF Patel",     role: "firefighter", homebase_station_id: stCentral.id, hire_date: "2026-04-02T00:00:00Z", skills: ["hazmat"], schedule_template: "standard", active: true },
    { id: "p_004", name: "Medic Reyes",  role: "paramedic",   homebase_station_id: stCentral.id, hire_date: "2026-04-18T00:00:00Z", skills: ["als"], schedule_template: "standard", active: true },
    { id: "p_005", name: "EMT Walker",   role: "emt",         homebase_station_id: stCentral.id, hire_date: "2026-04-22T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_006", name: "Off. Cole",    role: "officer",     homebase_station_id: stCentral.id, hire_date: "2026-04-29T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_007", name: "Capt. Iverson", role: "captain",    homebase_station_id: stEast.id,    hire_date: "2026-03-08T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_008", name: "FF Bauer",     role: "firefighter", homebase_station_id: stEast.id,    hire_date: "2026-03-21T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_009", name: "Medic Liu",    role: "paramedic",   homebase_station_id: stEast.id,    hire_date: "2026-04-12T00:00:00Z", skills: ["als"], schedule_template: "standard", active: true },
  ];

  const units: Unit[] = [
    { id: "u_e1",  callsign: "E1",  vehicle_id: "v_e1",  homebase_station_id: stCentral.id, status: "available", status_since_game_min: 0, current_position: QC_CENTER, crew: ["p_001", "p_002", "p_003"] },
    { id: "u_l1",  callsign: "L1",  vehicle_id: "v_l1",  homebase_station_id: stCentral.id, status: "available", status_since_game_min: 0, current_position: QC_CENTER, crew: ["p_002"] },
    { id: "u_m1",  callsign: "M1",  vehicle_id: "v_m1",  homebase_station_id: stCentral.id, status: "available", status_since_game_min: 0, current_position: QC_CENTER, crew: ["p_004", "p_005"] },
    { id: "u_p1",  callsign: "P1",  vehicle_id: "v_p1",  homebase_station_id: stCentral.id, status: "available", status_since_game_min: 0, current_position: QC_CENTER, crew: ["p_006"] },
    { id: "u_e2",  callsign: "E2",  vehicle_id: "v_e2",  homebase_station_id: stEast.id,    status: "available", status_since_game_min: 0, current_position: stEastCoord, crew: ["p_007", "p_008"] },
    { id: "u_m2",  callsign: "M2",  vehicle_id: "v_m2",  homebase_station_id: stEast.id,    status: "available", status_since_game_min: 0, current_position: stEastCoord, crew: ["p_009"] },
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

  // Capture each unit's starting coord — returnToLobby uses this to send
  // every unit back home after a shift completes (no road-graph reroute).
  const homebases = new Map<string, Coord>(units.map((u) => [u.id, u.current_position]));

  // Hydrate the store wholesale (cleaner than per-row upserts).
  const f = useFloor.getState();
  useFloor.setState({
    addresses: new Map(addresses.map((a) => [a.id, a])),
    stations: new Map(stations.map((s) => [s.id, s])),
    vehicles: new Map(vehicles.map((v) => [v.id, v])),
    personnel: new Map(personnel.map((p) => [p.id, p])),
    units: new Map(units.map((u) => [u.id, u])),
    incidents: new Map(),
    callers: new Map([[caller.id, caller]]),
    intel: new Map(),
    hostiles: new Map(),
    objectives: new Map(),
    campaign: "civil_dispatch",
    road_graph: roadGraph,
    game_min: 0,
    shift: null,
    shift_id: null,
    shift_status: "idle",
    incidents_spawned: new Set(),
    shift_outcome: null,
    available_shifts: shifts,
    unit_homebases: homebases,
    paused: false,
  });

  const graphSummary = roadGraph
    ? `${roadGraph.nodes.size} nodes`
    : "no road graph";
  f.logEvent(
    `boot — ${shifts.length} shifts available · ${stations.length} stations · ${units.length} units · ${addresses.length} addrs · ${graphSummary} · awaiting lobby`,
  );
}
