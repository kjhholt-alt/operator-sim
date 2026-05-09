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
  Shift,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";
import type { RoadGraph } from "@/sim/roadGraph";
import type { ShiftOutcome } from "@/sim/shift";

export type SimSpeed = 0 | 0.5 | 1 | 2 | 4;

export interface Selection {
  kind: EntityKind;
  id: string;
}

export interface Camera {
  center: Coord;
  zoom: number;
}

export type ShiftStatus = "idle" | "running" | "complete";

export interface FloorState {
  // ── time ──
  speed: SimSpeed;
  paused: boolean;
  game_min: number; // fractional minutes since shift start
  shift_id: string | null;

  // ── shift ──
  // The loaded shift definition (immutable per session). Null until loadShift
  // is called. Drives the spawn timeline + scoring at end-of-shift.
  shift: Shift | null;
  shift_status: ShiftStatus;
  // Set of ShiftIncident.id that have already been promoted to live incidents.
  // Used by spawnDueIncidents to make the spawn step idempotent across ticks.
  incidents_spawned: Set<string>;
  shift_outcome: ShiftOutcome | null;

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
  // Browser-history-style nav stack. `nav_back` is past selections (oldest
  // first); `nav_forward` holds redo-able future selections after a goBack.
  // `select(s)` pushes the previous selection onto nav_back and clears
  // nav_forward; `goBack` / `goForward` walk between them.
  nav_back: Selection[];
  nav_forward: Selection[];
  camera: Camera;

  // ── world geometry ──
  road_graph: RoadGraph | null;

  // ── meta ──
  last_event_log: Array<{ ts: number; game_min: number; text: string }>;

  // ── actions ──
  tick: (delta_game_min: number) => void;
  setSpeed: (speed: SimSpeed) => void;
  togglePause: () => void;
  select: (sel: Selection | null) => void;
  goBack: () => void;
  goForward: () => void;
  clearNav: () => void;
  setCamera: (c: Partial<Camera>) => void;
  setRoadGraph: (g: RoadGraph | null) => void;
  upsertUnit: (u: Unit) => void;
  upsertIncident: (i: Incident) => void;
  logEvent: (text: string) => void;

  // ── shift actions ──
  loadShift: (shift: Shift) => void;
  markIncidentSpawned: (shift_incident_id: string) => void;
  completeShift: (outcome: ShiftOutcome) => void;
  dismissShiftOutcome: () => void;

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

    shift: null,
    shift_status: "idle",
    incidents_spawned: new Set(),
    shift_outcome: null,

    units: new Map(),
    incidents: new Map(),
    callers: new Map(),
    addresses: new Map(),
    personnel: new Map(),
    intel: new Map(),
    stations: new Map(),
    vehicles: new Map(),

    selection: null,
    nav_back: [],
    nav_forward: [],
    camera: { center: QC_CENTER, zoom: 12 },

    road_graph: null,

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
      set((s) => {
        // Idempotent — clicking the same entity is a no-op (no history churn).
        if (
          (sel === null && s.selection === null) ||
          (sel && s.selection && sel.kind === s.selection.kind && sel.id === s.selection.id)
        ) {
          return {};
        }
        const back = s.selection ? [...s.nav_back, s.selection] : s.nav_back;
        // Cap history depth so a long session doesn't unbounded-grow.
        const trimmed = back.length > 50 ? back.slice(-50) : back;
        return { selection: sel, nav_back: trimmed, nav_forward: [] };
      });
    },
    goBack() {
      set((s) => {
        if (s.nav_back.length === 0) return {};
        const prev = s.nav_back[s.nav_back.length - 1];
        const newBack = s.nav_back.slice(0, -1);
        const newForward = s.selection ? [...s.nav_forward, s.selection] : s.nav_forward;
        return { selection: prev, nav_back: newBack, nav_forward: newForward };
      });
    },
    goForward() {
      set((s) => {
        if (s.nav_forward.length === 0) return {};
        const next = s.nav_forward[s.nav_forward.length - 1];
        const newForward = s.nav_forward.slice(0, -1);
        const newBack = s.selection ? [...s.nav_back, s.selection] : s.nav_back;
        return { selection: next, nav_back: newBack, nav_forward: newForward };
      });
    },
    clearNav() {
      set({ selection: null, nav_back: [], nav_forward: [] });
    },
    setCamera(c) {
      set((s) => ({ camera: { ...s.camera, ...c } }));
    },
    setRoadGraph(g) {
      set({ road_graph: g });
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

    loadShift(shift) {
      set({
        shift,
        shift_id: shift.id,
        shift_status: "running",
        incidents_spawned: new Set(),
        shift_outcome: null,
      });
    },
    markIncidentSpawned(shift_incident_id) {
      set((s) => {
        const next = new Set(s.incidents_spawned);
        next.add(shift_incident_id);
        return { incidents_spawned: next };
      });
    },
    completeShift(outcome) {
      set({ shift_status: "complete", shift_outcome: outcome, paused: true });
    },
    dismissShiftOutcome() {
      set({ shift_outcome: null });
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
