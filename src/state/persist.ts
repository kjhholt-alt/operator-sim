/**
 * Operator Sim — save/replay persistence (Day 14).
 *
 * Snapshot the full FloorState to a plain JSON-able value, write it to
 * Dexie's `saves` table, and restore it back. road_graph is NOT included
 * in the snapshot — it's an immutable boot artifact and gets re-attached
 * by the caller. Everything else (entity maps, shift, history, camera,
 * view mode, event log) round-trips.
 */

import { useFloor, type FloorState, type ShiftStatus, type ViewMode, type SimSpeed, type Selection, type Camera } from "./useFloor";
import { db, type SaveSlot } from "./db";
import type {
  Address,
  Caller,
  Coord,
  Incident,
  Intel,
  Personnel,
  Shift,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";
import type { ShiftOutcome } from "@/sim/shift";

export const SNAPSHOT_VERSION = 1;

export interface FloorSnapshot {
  v: typeof SNAPSHOT_VERSION;
  speed: SimSpeed;
  paused: boolean;
  game_min: number;
  shift_id: string | null;

  shift: Shift | null;
  shift_status: ShiftStatus;
  incidents_spawned: string[];
  shift_outcome: ShiftOutcome | null;
  available_shifts: Shift[];
  unit_homebases: Array<[string, Coord]>;

  units: Array<[string, Unit]>;
  incidents: Array<[string, Incident]>;
  callers: Array<[string, Caller]>;
  addresses: Array<[string, Address]>;
  personnel: Array<[string, Personnel]>;
  intel: Array<[string, Intel]>;
  stations: Array<[string, Station]>;
  vehicles: Array<[string, Vehicle]>;

  selection: Selection | null;
  nav_back: Selection[];
  nav_forward: Selection[];
  camera: Camera;

  view_mode: ViewMode;
  city_tod_override: number | null;

  last_event_log: Array<{ ts: number; game_min: number; text: string }>;
}

const mapEntries = <K, V>(m: Map<K, V>): Array<[K, V]> => Array.from(m.entries());

/**
 * Build a JSON-able snapshot of the live floor store. road_graph is
 * deliberately excluded — caller restores it from the bake.
 */
export function serializeFloor(s: FloorState): FloorSnapshot {
  return {
    v: SNAPSHOT_VERSION,
    speed: s.speed,
    paused: s.paused,
    game_min: s.game_min,
    shift_id: s.shift_id,

    shift: s.shift,
    shift_status: s.shift_status,
    incidents_spawned: Array.from(s.incidents_spawned),
    shift_outcome: s.shift_outcome,
    available_shifts: s.available_shifts,
    unit_homebases: mapEntries(s.unit_homebases),

    units: mapEntries(s.units),
    incidents: mapEntries(s.incidents),
    callers: mapEntries(s.callers),
    addresses: mapEntries(s.addresses),
    personnel: mapEntries(s.personnel),
    intel: mapEntries(s.intel),
    stations: mapEntries(s.stations),
    vehicles: mapEntries(s.vehicles),

    selection: s.selection,
    nav_back: [...s.nav_back],
    nav_forward: [...s.nav_forward],
    camera: { ...s.camera },

    view_mode: s.view_mode,
    city_tod_override: s.city_tod_override,

    last_event_log: [...s.last_event_log],
  };
}

/**
 * Apply a snapshot back to the live floor store. Preserves road_graph
 * (the bake survives a load); replaces every other field. Idempotent on
 * the same snap.
 */
export function applySnapshot(snap: FloorSnapshot): void {
  if (snap.v !== SNAPSHOT_VERSION) {
    throw new Error(`unsupported snapshot version ${snap.v}; expected ${SNAPSHOT_VERSION}`);
  }
  // setState merges with current state — road_graph (immutable bake) is
  // simply omitted and survives the apply.
  useFloor.setState({
    speed: snap.speed,
    paused: snap.paused,
    game_min: snap.game_min,
    shift_id: snap.shift_id,

    shift: snap.shift,
    shift_status: snap.shift_status,
    incidents_spawned: new Set(snap.incidents_spawned),
    shift_outcome: snap.shift_outcome,
    available_shifts: snap.available_shifts,
    unit_homebases: new Map(snap.unit_homebases),

    units: new Map(snap.units),
    incidents: new Map(snap.incidents),
    callers: new Map(snap.callers),
    addresses: new Map(snap.addresses),
    personnel: new Map(snap.personnel),
    intel: new Map(snap.intel),
    stations: new Map(snap.stations),
    vehicles: new Map(snap.vehicles),

    selection: snap.selection,
    nav_back: [...snap.nav_back],
    nav_forward: [...snap.nav_forward],
    camera: { ...snap.camera },

    view_mode: snap.view_mode,
    city_tod_override: snap.city_tod_override,

    last_event_log: [...snap.last_event_log],
  });
}

// ── Dexie persistence ────────────────────────────────────────────────────

/**
 * id slug for a save. Lowercase, alphanumeric + dashes only. Collisions
 * overwrite (Dexie's put semantics).
 */
export function slugForSaveName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : `save-${Date.now()}`;
}

function shiftCity(snap: FloorSnapshot): string {
  return snap.shift?.city ?? "unknown";
}

function shiftTier(snap: FloorSnapshot): number {
  return snap.shift?.difficulty_tier ?? 0;
}

/**
 * Snapshot the live floor and write a save slot. Returns the persisted
 * SaveSlot. Used by the `save <name>` verb.
 */
export async function saveSnapshot(name: string): Promise<SaveSlot> {
  const snap = serializeFloor(useFloor.getState());
  const id = slugForSaveName(name);
  const slot: SaveSlot = {
    id,
    name: name.trim() || id,
    city: shiftCity(snap),
    difficulty_tier: shiftTier(snap),
    game_min_total: snap.game_min,
    saved_at: new Date().toISOString(),
    snapshot: snap,
  };
  await db.saves.put(slot);
  return slot;
}

/**
 * Load a save by id, apply it to the floor. Throws if the id is unknown.
 * Used by the `replay <name>` verb.
 */
export async function loadSnapshot(idOrName: string): Promise<SaveSlot> {
  const id = slugForSaveName(idOrName);
  const slot = await db.saves.get(id);
  if (!slot) throw new Error(`no save named ${idOrName}`);
  applySnapshot(slot.snapshot as FloorSnapshot);
  return slot;
}

export async function listSaves(): Promise<SaveSlot[]> {
  const all = await db.saves.orderBy("saved_at").reverse().toArray();
  return all;
}

export async function deleteSave(idOrName: string): Promise<void> {
  const id = slugForSaveName(idOrName);
  await db.saves.delete(id);
}
