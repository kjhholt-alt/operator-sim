/**
 * Operator Sim entity ontology — Zod schemas.
 *
 * These are the source of truth. TypeScript types are derived (`z.infer<...>`).
 * IndexedDB (Dexie) tables map 1:1 to these schemas. Tauri IPC payloads validate against them.
 *
 * Locked by Designer per `docs/GDD.md` § 5. Changes require Producer approval (touchpoint).
 */

import { z } from "zod";

// ── Primitives ──────────────────────────────────────────────────────────

export const Coord = z.tuple([z.number(), z.number()]); // [lng, lat] — GeoJSON convention
export type Coord = z.infer<typeof Coord>;

export const ISOTimestamp = z.string().datetime();
export type ISOTimestamp = z.infer<typeof ISOTimestamp>;

// Game-time, fractional minutes since shift start.
export const GameMin = z.number().nonnegative();
export type GameMin = z.infer<typeof GameMin>;

export const EntityKind = z.enum([
  "unit",
  "incident",
  "caller",
  "address",
  "personnel",
  "intel",
  "station",
  "vehicle",
]);
export type EntityKind = z.infer<typeof EntityKind>;

// ── Status enums ────────────────────────────────────────────────────────

export const UnitStatus = z.enum([
  "available",
  "en_route",
  "on_scene",
  "transporting",
  "returning",
  "out_of_service",
]);
export type UnitStatus = z.infer<typeof UnitStatus>;

export const IncidentStatus = z.enum([
  "queued",
  "dispatched",
  "on_scene",
  "resolved",
  "cancelled",
]);
export type IncidentStatus = z.infer<typeof IncidentStatus>;

export const IncidentSeverity = z.enum(["low", "moderate", "high", "critical"]);
export type IncidentSeverity = z.infer<typeof IncidentSeverity>;

// NFIRS-aligned top-level + a working subset for v0.1. Expand per Designer.
export const IncidentType = z.enum([
  "fire_residential",
  "fire_commercial",
  "fire_vehicle",
  "fire_brush",
  "medical_cardiac",
  "medical_trauma",
  "medical_general",
  "rescue_motor_vehicle",
  "rescue_water",
  "hazmat_spill",
  "alarm_false",
  "service_call",
  "police_disturbance",
  "police_traffic",
  "police_burglary",
  "police_assault",
]);
export type IncidentType = z.infer<typeof IncidentType>;

export const Agency = z.enum(["fire", "ems", "police", "swat", "fed"]);
export type Agency = z.infer<typeof Agency>;

export const VehicleClass = z.enum([
  // fire
  "engine",
  "ladder",
  "tanker",
  "rescue",
  "brush",
  "command",
  // ems
  "ambulance_als",
  "ambulance_bls",
  "supervisor",
  // police
  "patrol",
  "k9",
  "swat_armored",
  "marine",
  "air",
]);
export type VehicleClass = z.infer<typeof VehicleClass>;

export const PersonnelRole = z.enum([
  "firefighter",
  "paramedic",
  "emt",
  "officer",
  "swat_operator",
  "lieutenant",
  "captain",
  "chief",
  "dispatcher",
]);
export type PersonnelRole = z.infer<typeof PersonnelRole>;

// ── Core entities ───────────────────────────────────────────────────────

export const Address = z.object({
  id: z.string(),
  street: z.string(),
  city: z.string(),
  state: z.string().length(2),
  postal: z.string().optional(),
  coord: Coord,
  building_id: z.string().optional(), // OSM building footprint reference
});
export type Address = z.infer<typeof Address>;

export const Station = z.object({
  id: z.string(),
  name: z.string(),
  agency: Agency,
  address_id: z.string(),
  built_at: ISOTimestamp,
  capacity_units: z.number().int().nonnegative(),
  capacity_personnel: z.number().int().nonnegative(),
});
export type Station = z.infer<typeof Station>;

export const Vehicle = z.object({
  id: z.string(),
  callsign: z.string(), // e.g. "E1", "M2", "234"
  class: VehicleClass,
  homebase_station_id: z.string(),
  purchased_at: ISOTimestamp,
  status: z.enum(["operational", "maintenance", "out_of_service"]),
  mileage_km: z.number().nonnegative().default(0),
});
export type Vehicle = z.infer<typeof Vehicle>;

export const Personnel = z.object({
  id: z.string(),
  name: z.string(),
  role: PersonnelRole,
  homebase_station_id: z.string(),
  hire_date: ISOTimestamp,
  skills: z.array(z.string()).default([]),
  schedule_template: z.string().default("standard"),
  active: z.boolean().default(true),
});
export type Personnel = z.infer<typeof Personnel>;

export const Unit = z.object({
  id: z.string(),
  callsign: z.string(),
  vehicle_id: z.string(),
  homebase_station_id: z.string(),
  status: UnitStatus,
  status_since_game_min: GameMin,
  current_position: Coord,
  current_route: z.array(Coord).optional(),
  // Distance traveled along current_route (meters). `along` polyline progress.
  route_progress_m: z.number().nonnegative().optional(),
  route_total_m: z.number().nonnegative().optional(),
  // FSM scratchpad: where the unit is heading and what it's expected to do on arrival.
  destination_coord: Coord.optional(),
  on_arrival: z.enum(["on_scene", "available"]).optional(),
  current_incident_id: z.string().optional(),
  crew: z.array(z.string()).max(8), // Personnel IDs
});
export type Unit = z.infer<typeof Unit>;

export const Caller = z.object({
  id: z.string(),
  display: z.string(), // e.g. "Margaret K., 67yo female"
  phone: z.string().optional(),
  address_id: z.string().optional(),
  prior_incidents: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type Caller = z.infer<typeof Caller>;

export const Incident = z.object({
  id: z.string(),
  type: IncidentType,
  severity: IncidentSeverity,
  status: IncidentStatus,
  address_id: z.string(),
  caller_id: z.string().optional(),
  reported_at_game_min: GameMin,
  resolution_window_game_min: GameMin,
  dispatched_unit_ids: z.array(z.string()).default([]),
  resolved_at_game_min: GameMin.optional(),
  resolution_notes: z.string().optional(),
  narrative_thread_id: z.string().optional(),
  shift_id: z.string(),
});
export type Incident = z.infer<typeof Incident>;

export const Intel = z.object({
  id: z.string(),
  type: z.enum(["bolo", "weather", "pattern", "radio_chatter", "fed_advisory"]),
  severity: IncidentSeverity,
  body: z.string(),
  posted_at_game_min: GameMin,
  expires_at_game_min: GameMin.optional(),
  linked_entity_ids: z.array(z.string()).default([]), // any other entity
});
export type Intel = z.infer<typeof Intel>;

// ── Shift document (DM-generated narrative) ─────────────────────────────

export const NarrativeThread = z.object({
  id: z.string(),
  arc: z.string(),
  incident_ids: z.array(z.string()).min(1),
  intel_ids: z.array(z.string()).default([]),
});
export type NarrativeThread = z.infer<typeof NarrativeThread>;

export const ShiftIncident = z.object({
  id: z.string(),
  spawn_time_game_min: GameMin,
  type: IncidentType,
  severity: IncidentSeverity.default("moderate"),
  address: z.string(), // human address — validator resolves to Address.id
  caller_persona: z.string().optional(),
  expected_units: z.string().optional(), // e.g. "1 medic"
  resolution_window_game_min: GameMin,
  narrative_hooks: z.array(z.string()).default([]),
  thread_id: z.string().optional(),
});
export type ShiftIncident = z.infer<typeof ShiftIncident>;

export const ShiftIntel = z.object({
  id: z.string(),
  type: Intel.shape.type,
  severity: IncidentSeverity.default("low"),
  body: z.string(),
});
export type ShiftIntel = z.infer<typeof ShiftIntel>;

export const Shift = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  city: z.string().default("quad_cities"),
  difficulty_tier: z.number().int().min(1).max(5),
  length_game_min: GameMin.default(12),
  narrative_threads: z.array(NarrativeThread).default([]),
  incidents: z.array(ShiftIncident).min(1),
  intel: z.array(ShiftIntel).default([]),
  notes: z.string().optional(),
});
export type Shift = z.infer<typeof Shift>;

// ── Aggregate union (for ontology browser) ──────────────────────────────

export const AnyEntity = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unit"), data: Unit }),
  z.object({ kind: z.literal("incident"), data: Incident }),
  z.object({ kind: z.literal("caller"), data: Caller }),
  z.object({ kind: z.literal("address"), data: Address }),
  z.object({ kind: z.literal("personnel"), data: Personnel }),
  z.object({ kind: z.literal("intel"), data: Intel }),
  z.object({ kind: z.literal("station"), data: Station }),
  z.object({ kind: z.literal("vehicle"), data: Vehicle }),
]);
export type AnyEntity = z.infer<typeof AnyEntity>;
