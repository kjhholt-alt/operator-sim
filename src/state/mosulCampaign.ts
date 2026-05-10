/**
 * Operator Sim — Mosul "Command Ops" campaign boot (Day 12.5 war-smoke).
 *
 * This is a deliberately tight smoke test: synthetic addresses + a
 * military roster + 4 hostiles + 3 objectives, all centered on a
 * Mosul-shaped bbox. No real OSM scrape — that's a Phase 2 problem.
 * The point is to see if the chassis (Foundry shell + ontology +
 * verbs + dossier) actually feels right when the entities are
 * military instead of civil.
 *
 * If it sings, we promote this to a real Phase 2 campaign with OSM
 * tiles, persistent rosters, fog-of-war, and combat resolution.
 * If it doesn't, we lost a day and learned something.
 *
 * Boot path: `?campaign=mosul` URL param → seed.ts dispatches here
 * instead of the civil Quad-Cities boot.
 */

import type {
  Address,
  Caller,
  Coord,
  Hostile,
  Objective,
  Personnel,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";
import { useFloor } from "./useFloor";

// Mosul, Iraq centered around 36.345°N 43.150°E. Old City + east-bank
// industrial corridor. Synthetic addresses cluster around real Mosul
// landmarks but coords are illustrative — this is a smoke test, not
// a geo-accurate scenario.
const FORWARD_OPS_BASE: Coord = [43.135, 36.330]; // SW edge — friendly turf
const TOC_COORD: Coord = [43.165, 36.355]; // NE — tactical operations centre

interface BootHandle {
  addresses: Address[];
  stations: Station[];
  vehicles: Vehicle[];
  personnel: Personnel[];
  units: Unit[];
  callers: Caller[];
  hostiles: Hostile[];
  objectives: Objective[];
}

function buildMosulData(): BootHandle {
  // ── Addresses (synthetic, illustrative coords) ─────────────────────
  // Mix of friendly fortified positions, named neighbourhood landmarks,
  // and target sites. We use generic "District / Sector" labels rather
  // than real neighbourhood names to keep the framing clearly fictional.
  const addresses: Address[] = [
    { id: "a_fob_lima",       street: "FOB LIMA · MSR Tampa",       city: "Sector 1", state: "MO", coord: FORWARD_OPS_BASE },
    { id: "a_toc_alpha",      street: "TOC ALPHA · Northeast Wall", city: "Sector 1", state: "MO", coord: TOC_COORD },
    { id: "a_district_g",     street: "District Gamma · Souk",      city: "Sector 1", state: "MO", coord: [43.148, 36.342] },
    { id: "a_industrial_e",   street: "Industrial Sector E",        city: "Sector 1", state: "MO", coord: [43.172, 36.348] },
    { id: "a_river_corridor", street: "River Corridor · Bridge 4",  city: "Sector 1", state: "MO", coord: [43.155, 36.340] },
    { id: "a_clinic_north",   street: "Civilian Clinic · North",    city: "Sector 1", state: "MO", coord: [43.160, 36.355] },
    { id: "a_msr_route",      street: "MSR Sycamore · KM 12",       city: "Sector 1", state: "MO", coord: [43.140, 36.336] },
    { id: "a_compound_h",     street: "Compound Hotel · grid 4-7",  city: "Sector 1", state: "MO", coord: [43.158, 36.350] },
    { id: "a_overlook_w",     street: "Overlook Whiskey · grid 2-3", city: "Sector 1", state: "MO", coord: [43.145, 36.352] },
    { id: "a_market_g",       street: "Market Golf · open square",  city: "Sector 1", state: "MO", coord: [43.150, 36.343] },
    { id: "a_port_p",         street: "Port Papa · river quay",     city: "Sector 1", state: "MO", coord: [43.152, 36.338] },
    { id: "a_sigint_node",    street: "SIGINT Node · cell tower",   city: "Sector 1", state: "MO", coord: [43.166, 36.346] },
  ];

  // ── Friendly garrison ──────────────────────────────────────────────
  const stations: Station[] = [
    {
      id: "st_fob_lima",
      name: "FOB Lima",
      agency: "swat", // re-use chassis enum; reads as "tactical" in the dossier
      address_id: "a_fob_lima",
      built_at: "2026-05-09T00:00:00Z",
      capacity_units: 6,
      capacity_personnel: 32,
    },
    {
      id: "st_toc_alpha",
      name: "TOC Alpha",
      agency: "fed",
      address_id: "a_toc_alpha",
      built_at: "2026-05-09T00:00:00Z",
      capacity_units: 4,
      capacity_personnel: 18,
    },
  ];

  // ── Vehicles (military-flavoured, mapped onto civil chassis) ──────
  // We re-use the existing VehicleClass enum for the smoke test rather
  // than extending it. Mapping:
  //   patrol         → ground patrol element (Hilux / MRAP)
  //   swat_armored   → assault element (heavy IFV / tracked)
  //   air            → drone / air asset
  //   command        → command-and-control vehicle
  //   ambulance_als  → CASEVAC
  // Phase 2 would replace these with real military classes.
  const vehicles: Vehicle[] = [
    { id: "v_recon1", callsign: "RECON-1",  class: "patrol",       homebase_station_id: "st_fob_lima",  purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_recon2", callsign: "RECON-2",  class: "patrol",       homebase_station_id: "st_fob_lima",  purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_assault", callsign: "ASSAULT-1", class: "swat_armored", homebase_station_id: "st_fob_lima",  purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_drone1", callsign: "EAGLE-1",  class: "air",          homebase_station_id: "st_toc_alpha", purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_cmd",    callsign: "ACTUAL",   class: "command",      homebase_station_id: "st_toc_alpha", purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
    { id: "v_casevac", callsign: "CASEVAC-1", class: "ambulance_als", homebase_station_id: "st_fob_lima", purchased_at: "2026-05-09T00:00:00Z", status: "operational", mileage_km: 0 },
  ];

  // ── Personnel (call-signs, callsign-style names) ───────────────────
  const personnel: Personnel[] = [
    { id: "p_lead", name: "Sgt. Vega (LEAD)",        role: "captain",       homebase_station_id: "st_fob_lima",  hire_date: "2026-03-12T00:00:00Z", skills: ["breacher"], schedule_template: "standard", active: true },
    { id: "p_o1",   name: "Op. Reyes",                role: "swat_operator", homebase_station_id: "st_fob_lima",  hire_date: "2026-03-15T00:00:00Z", skills: ["sniper"], schedule_template: "standard", active: true },
    { id: "p_o2",   name: "Op. Khalil",               role: "swat_operator", homebase_station_id: "st_fob_lima",  hire_date: "2026-04-02T00:00:00Z", skills: ["medic"], schedule_template: "standard", active: true },
    { id: "p_o3",   name: "Op. Park",                 role: "swat_operator", homebase_station_id: "st_fob_lima",  hire_date: "2026-04-18T00:00:00Z", skills: ["eod"], schedule_template: "standard", active: true },
    { id: "p_isr",  name: "Lt. Tarek (ISR)",          role: "lieutenant",    homebase_station_id: "st_toc_alpha", hire_date: "2026-04-22T00:00:00Z", skills: ["sigint", "geoint"], schedule_template: "standard", active: true },
    { id: "p_actual", name: "Maj. Hollis (ACTUAL)",   role: "chief",         homebase_station_id: "st_toc_alpha", hire_date: "2026-04-29T00:00:00Z", skills: [], schedule_template: "standard", active: true },
    { id: "p_casevac", name: "SSG Ortega (CASEVAC)",  role: "paramedic",     homebase_station_id: "st_fob_lima",  hire_date: "2026-03-08T00:00:00Z", skills: ["als"], schedule_template: "standard", active: true },
  ];

  // ── Units (live tactical assets) ───────────────────────────────────
  const units: Unit[] = [
    { id: "u_recon1",  callsign: "RECON-1",   vehicle_id: "v_recon1",  homebase_station_id: "st_fob_lima",  status: "available", status_since_game_min: 0, current_position: FORWARD_OPS_BASE, crew: ["p_lead", "p_o1"] },
    { id: "u_recon2",  callsign: "RECON-2",   vehicle_id: "v_recon2",  homebase_station_id: "st_fob_lima",  status: "available", status_since_game_min: 0, current_position: FORWARD_OPS_BASE, crew: ["p_o2"] },
    { id: "u_assault", callsign: "ASSAULT-1", vehicle_id: "v_assault", homebase_station_id: "st_fob_lima",  status: "available", status_since_game_min: 0, current_position: FORWARD_OPS_BASE, crew: ["p_o3"] },
    { id: "u_eagle1",  callsign: "EAGLE-1",   vehicle_id: "v_drone1",  homebase_station_id: "st_toc_alpha", status: "available", status_since_game_min: 0, current_position: TOC_COORD, crew: ["p_isr"] },
    { id: "u_actual",  callsign: "ACTUAL",    vehicle_id: "v_cmd",     homebase_station_id: "st_toc_alpha", status: "available", status_since_game_min: 0, current_position: TOC_COORD, crew: ["p_actual"] },
    { id: "u_casevac", callsign: "CASEVAC-1", vehicle_id: "v_casevac", homebase_station_id: "st_fob_lima",  status: "available", status_since_game_min: 0, current_position: FORWARD_OPS_BASE, crew: ["p_casevac"] },
  ];

  // ── Callers (HUMINT sources) ───────────────────────────────────────
  const callers: Caller[] = [
    {
      id: "c_humint_iris",
      display: "HUMINT · IRIS · local source, market quarter",
      phone: "encrypted",
      address_id: "a_market_g",
      prior_incidents: [],
      notes: "Reliability B-2 (USUALLY RELIABLE). Last contact 18h ago. Reported VBIED staging in Industrial Sector E.",
    },
    {
      id: "c_humint_orion",
      display: "HUMINT · ORION · port worker",
      phone: "encrypted",
      address_id: "a_port_p",
      prior_incidents: [],
      notes: "Reliability C-3 (FAIRLY RELIABLE). Quay activity at night, possible cache movement.",
    },
  ];

  // ── Hostiles (the threat picture) ──────────────────────────────────
  const hostiles: Hostile[] = [
    {
      id: "h_001",
      type: "vbied",
      status: "suspected",
      severity: "critical",
      coord: [43.172, 36.348], // industrial sector
      last_known_at_game_min: 0,
      intel_confidence: 0.45,
      linked_intel_ids: ["x_humint_iris"],
      notes: "HUMINT IRIS reports white sedan, Hilux body kit, parked at warehouse #4 since 0200L. No civilian pattern of life around it.",
    },
    {
      id: "h_002",
      type: "sniper_position",
      status: "confirmed",
      severity: "high",
      coord: [43.158, 36.350], // compound H
      last_known_at_game_min: 0,
      intel_confidence: 0.85,
      linked_intel_ids: ["x_imint_drone"],
      notes: "EAGLE-1 IMINT pass at 0612L confirmed two armed males on the SE rooftop of compound HOTEL. Long arms, optics. Overwatch on MSR Sycamore.",
    },
    {
      id: "h_003",
      type: "weapons_cache",
      status: "suspected",
      severity: "moderate",
      coord: [43.152, 36.338], // port papa
      last_known_at_game_min: 0,
      intel_confidence: 0.30,
      linked_intel_ids: ["x_humint_orion"],
      notes: "HUMINT ORION reports nightly small-craft activity at quay 3. Possible weapons trans-shipment from upriver.",
    },
    {
      id: "h_004",
      type: "ied_emplaced",
      status: "suspected",
      severity: "high",
      coord: [43.140, 36.336], // MSR sycamore
      last_known_at_game_min: 0,
      intel_confidence: 0.55,
      linked_intel_ids: [],
      notes: "Pattern-of-life break on MSR Sycamore KM 12 — a herder who has used this route every morning for 40 days didn't appear yesterday. Local nationals are routing around the spot.",
    },
  ];

  // ── Intel feeds (linked to hostiles via id) ─────────────────────────
  // We don't add these as separate Intel entities for the smoke test —
  // the linked_intel_ids on hostiles reference notional intel, and the
  // dossier renders them as muted rows. Phase 2 would back them with
  // real Intel records.

  // ── Objectives (the operator's mission card stack) ─────────────────
  const objectives: Objective[] = [
    {
      id: "op_crimson_quill",
      type: "raid",
      status: "planned",
      severity: "critical",
      address_id: "a_industrial_e",
      hostile_id: "h_001",
      briefed_at_game_min: 0,
      kpi_window_game_min: 25,
      required_unit_classes: ["swat_armored", "patrol"],
      tasked_unit_ids: [],
      brief: "Direct action on suspected VBIED at warehouse #4. ROE: positive ID required. Civilian density LOW (industrial zone, off-shift). Confirm hostile via EAGLE-1 IMINT before kinetic. ASSAULT-1 + RECON-1 element. No-strike list: school 600m W, clinic 400m N.",
    },
    {
      id: "op_silent_tower",
      type: "overwatch",
      status: "planned",
      severity: "high",
      address_id: "a_overlook_w",
      hostile_id: "h_002",
      briefed_at_game_min: 0,
      kpi_window_game_min: 40,
      required_unit_classes: ["patrol"],
      tasked_unit_ids: [],
      brief: "Establish counter-sniper overwatch on compound HOTEL from grid 2-3 (Overlook WHISKEY). RECON element holds eyes-on for 30 min, calls in EAGLE-1 strike if targets are positively engaged in hostile activity. ROE: defensive only, no first-shot.",
    },
    {
      id: "op_night_market",
      type: "intel_collection",
      status: "planned",
      severity: "moderate",
      address_id: "a_market_g",
      briefed_at_game_min: 0,
      kpi_window_game_min: 30,
      required_unit_classes: ["patrol"],
      tasked_unit_ids: [],
      brief: "Soft-pattern presence patrol through Market GOLF. Goal: meet HUMINT IRIS (in person, no comms), validate VBIED report on h_001. Single vehicle, low profile, no escalation. CASEVAC-1 on standby at FOB.",
    },
  ];

  return { addresses, stations, vehicles, personnel, units, callers, hostiles, objectives };
}

/**
 * Boot the Mosul "Command Ops" campaign. Replaces (does not merge with)
 * any civil dispatch state. Only call from `bootFloor()` when the
 * `?campaign=mosul` URL param is set.
 */
export function bootMosulCampaign(): void {
  const data = buildMosulData();
  const homebases = new Map<string, Coord>(data.units.map((u) => [u.id, u.current_position]));

  useFloor.setState({
    addresses: new Map(data.addresses.map((a) => [a.id, a])),
    stations: new Map(data.stations.map((s) => [s.id, s])),
    vehicles: new Map(data.vehicles.map((v) => [v.id, v])),
    personnel: new Map(data.personnel.map((p) => [p.id, p])),
    units: new Map(data.units.map((u) => [u.id, u])),
    callers: new Map(data.callers.map((c) => [c.id, c])),
    incidents: new Map(),
    intel: new Map(),
    hostiles: new Map(data.hostiles.map((h) => [h.id, h])),
    objectives: new Map(data.objectives.map((o) => [o.id, o])),
    campaign: "command_ops",
    // No road graph for the smoke test — dispatch will fall back to
    // straight-line routing if pathfinding can't find a road graph node.
    road_graph: null,
    game_min: 0,
    shift: null,
    shift_id: "command_ops",
    shift_status: "idle",
    incidents_spawned: new Set(),
    shift_outcome: null,
    available_shifts: [],
    unit_homebases: homebases,
    paused: false,
    // Default to iso city view — the war-floor aesthetic feels right.
    view_mode: "city",
    // Default to a low-light tod so the watchfloor reads "operations".
    city_tod_override: 0.18,
  });

  const f = useFloor.getState();
  f.logEvent(
    `boot · COMMAND OPS · ${data.units.length} assets · ${data.hostiles.length} hostiles tracked · ${data.objectives.length} objectives on the wall · MOSUL bbox · stand by`,
  );
  f.logEvent(`bolo · h_001 VBIED suspected Industrial Sector E · HUMINT IRIS reliability B-2`);
  f.logEvent(`bolo · h_002 sniper position CONFIRMED at Compound HOTEL · IMINT 0612L · overwatch on MSR Sycamore`);
  f.logEvent(`weather · CAVOK · winds 240/12kt · sunset 18:42L · NIGHT OPS WINDOW opens 19:30L`);
}

/**
 * Read the `?campaign=...` URL param. Returns "command_ops" when the
 * value is "mosul" or "command_ops", otherwise "civil_dispatch".
 */
export function detectCampaignFromUrl(): "civil_dispatch" | "command_ops" {
  if (typeof window === "undefined") return "civil_dispatch";
  const params = new URLSearchParams(window.location.search);
  const c = (params.get("campaign") ?? "").toLowerCase();
  if (c === "mosul" || c === "command_ops" || c === "war") return "command_ops";
  return "civil_dispatch";
}
