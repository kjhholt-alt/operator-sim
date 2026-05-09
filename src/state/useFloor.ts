/**
 * Operator Sim — main zustand store ("the floor").
 *
 * Holds the working set: live entities, selection, time, camera, command queue.
 * All mutations go through actions on this store. Direct state.x = y is forbidden.
 *
 * Persisted state lives in dexie (src/state/db.ts). Save/load syncs the two.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Address,
  AnyEntity,
  Caller,
  Coord,
  EntityKind,
  Incident,
  Intel,
  Personnel,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";

export type SimSpeed = 0 | 0.5 | 1 | 2 | 4;

export interface Selection {
  kind: EntityKind;
  id: string;
}

export interface Camera {
  center: Coord;
  zoom: number;
}

export interface FloorState {
  // ── time ──
  speed: SimSpeed;
  paused: boolean;
  game_min: number; // fractional minutes since shift start
  shift_id: string | null;

  // ── working set ──
  units: Map<string, Unit>;
  incidents: Map<string, Incident>;
  callers: Map<string, Caller>;
  addresses: Map<string, Address>;
  personnel: Map<string, Personnel>;
  intel: Map<string, Intel>;
  stations: Map<string, Station>;
  vehicles: Map<string, Vehicle>;

  // ── view ──
  selection: Selection | null;
  camera: Camera;

  // ── meta ──
  last_event_log: Array<{ ts: number; game_min: number; text: string }>;

  // ── actions ──
  tick: (delta_game_min: number) => void;
  setSpeed: (speed: SimSpeed) => void;
  togglePause: () => void;
  select: (sel: Selection | null) => void;
  setCamera: (c: Partial<Camera>) => void;
  upsertUnit: (u: Unit) => void;
  upsertIncident: (i: Incident) => void;
  logEvent: (text: string) => void;

  // ── derived ──
  getEntity: (kind: EntityKind, id: string) => AnyEntity | null;
}

const QC_CENTER: Coord = [-90.5776, 41.5236];

export const useFloor = create<FloorState>()(
  subscribeWithSelector((set, get) => ({
    speed: 1,
    paused: false,
    game_min: 0,
    shift_id: null,

    units: new Map(),
    incidents: new Map(),
    callers: new Map(),
    addresses: new Map(),
    personnel: new Map(),
    intel: new Map(),
    stations: new Map(),
    vehicles: new Map(),

    selection: null,
    camera: { center: QC_CENTER, zoom: 12 },

    last_event_log: [],

    tick(delta_game_min) {
      if (get().paused) return;
      set((s) => ({ game_min: s.game_min + delta_game_min }));
    },
    setSpeed(speed) {
      set({ speed });
    },
    togglePause() {
      set((s) => ({ paused: !s.paused }));
    },
    select(sel) {
      set({ selection: sel });
    },
    setCamera(c) {
      set((s) => ({ camera: { ...s.camera, ...c } }));
    },
    upsertUnit(u) {
      set((s) => {
        const next = new Map(s.units);
        next.set(u.id, u);
        return { units: next };
      });
    },
    upsertIncident(i) {
      set((s) => {
        const next = new Map(s.incidents);
        next.set(i.id, i);
        return { incidents: next };
      });
    },
    logEvent(text) {
      set((s) => ({
        last_event_log: [
          { ts: Date.now(), game_min: s.game_min, text },
          ...s.last_event_log,
        ].slice(0, 200),
      }));
    },

    getEntity(kind, id) {
      const s = get();
      const map = (() => {
        switch (kind) {
          case "unit": return s.units;
          case "incident": return s.incidents;
          case "caller": return s.callers;
          case "address": return s.addresses;
          case "personnel": return s.personnel;
          case "intel": return s.intel;
          case "station": return s.stations;
          case "vehicle": return s.vehicles;
        }
      })();
      const data = map.get(id);
      if (!data) return null;
      return { kind, data } as AnyEntity;
    },
  })),
);
