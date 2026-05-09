/**
 * Watchfloor — Dexie (IndexedDB) schema.
 *
 * Persisted state for all entity kinds. zustand stores the live working set;
 * dexie is the durable layer for save/load + cross-shift continuity.
 *
 * Migrations: Dexie auto-migrates additive changes. Destructive changes
 * require a `db.version(N).upgrade(...)` block.
 */

import Dexie, { type EntityTable } from "dexie";
import type {
  Address,
  Caller,
  Incident,
  Intel,
  Personnel,
  Station,
  Unit,
  Vehicle,
  Shift,
} from "@/lib/schemas";

export interface SaveSlot {
  id: string;
  name: string;
  city: string;
  difficulty_tier: number;
  game_min_total: number;
  saved_at: string;
  // raw snapshot of zustand state at save time
  snapshot: unknown;
}

class WatchfloorDB extends Dexie {
  units!: EntityTable<Unit, "id">;
  incidents!: EntityTable<Incident, "id">;
  callers!: EntityTable<Caller, "id">;
  addresses!: EntityTable<Address, "id">;
  personnel!: EntityTable<Personnel, "id">;
  intel!: EntityTable<Intel, "id">;
  stations!: EntityTable<Station, "id">;
  vehicles!: EntityTable<Vehicle, "id">;
  shifts!: EntityTable<Shift, "id">;
  saves!: EntityTable<SaveSlot, "id">;

  constructor() {
    super("watchfloor");
    this.version(1).stores({
      units: "id, status, current_incident_id, homebase_station_id",
      incidents: "id, status, type, severity, address_id, shift_id",
      callers: "id, address_id",
      addresses: "id, street, city",
      personnel: "id, role, homebase_station_id, active",
      intel: "id, type, severity",
      stations: "id, agency, address_id",
      vehicles: "id, callsign, class, homebase_station_id, status",
      shifts: "id, date, difficulty_tier, city",
      saves: "id, saved_at",
    });
  }
}

export const db = new WatchfloorDB();
