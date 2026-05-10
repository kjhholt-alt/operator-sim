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
import { computeOutcome } from "@/sim/shift";

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

/**
 * Day 13: which center-pane renderer the operator is looking at.
 *
 *   "map"  — MapLibre GL on real OSM tiles (the default; Day 0–11 work).
 *   "city" — 2.5D isometric procedural city with day/night cycle (the
 *            claude.ai/design "Watchfloor" handoff bundle).
 *
 * Both views read the same floor entities; they're alternate render
 * surfaces, not alternate sims.
 */
export type ViewMode = "map" | "city";

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
  // Day 9: every shift YAML loaded at boot ends up here. Lobby + start verb
  // pick from this list. Roster (units/stations/vehicles/personnel) is
  // independent — units stay between shifts, only the timeline + live
  // incidents reset.
  available_shifts: Shift[];
  // Snapshot of unit homebase coords captured at boot, used by returnToLobby
  // to send everyone back to where they started without rerouting on the road
  // graph (lobby is a paused state, not a sim state).
  unit_homebases: Map<string, Coord>;

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

  // ── view mode (Day 13) ──
  view_mode: ViewMode;
  /**
   * Optional time-of-day override for the iso city view (0..1 wrap-around,
   * 0 = midnight, 0.5 = noon). Null = auto-cycle on the iso clock. Has no
   * effect in "map" mode.
   */
  city_tod_override: number | null;

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

  // ── view-mode actions (Day 13) ──
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setCityTodOverride: (tod: number | null) => void;

  // ── shift actions ──
  loadShift: (shift: Shift) => void;
  markIncidentSpawned: (shift_incident_id: string) => void;
  completeShift: (outcome: ShiftOutcome) => void;
  dismissShiftOutcome: () => void;
  setAvailableShifts: (shifts: Shift[]) => void;
  setUnitHomebases: (m: Map<string, Coord>) => void;
  /** Re-arm the currently loaded shift definition (idempotent re-roll). */
  restartShift: () => void;
  /** Force-end the running shift; computes outcome from current incidents. */
  endShiftNow: () => void;
  /** Drop shift state + reset roster to homebases; show lobby. */
  returnToLobby: () => void;

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
    available_shifts: [],
    unit_homebases: new Map(),

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

    view_mode: "map",
    city_tod_override: null,

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

    setViewMode(mode) {
      set({ view_mode: mode });
    },
    toggleViewMode() {
      set((s) => ({ view_mode: s.view_mode === "map" ? "city" : "map" }));
    },
    setCityTodOverride(tod) {
      set({ city_tod_override: tod });
    },

    loadShift(shift) {
      // Defensive: arming a shift always resets the wall clock and unpauses.
      // Caller can pause again immediately if they want to brief the player.
      set({
        shift,
        shift_id: shift.id,
        shift_status: "running",
        incidents_spawned: new Set(),
        shift_outcome: null,
        game_min: 0,
        paused: false,
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
    setAvailableShifts(shifts) {
      set({ available_shifts: shifts });
    },
    setUnitHomebases(m) {
      set({ unit_homebases: m });
    },
    restartShift() {
      const s = get();
      if (!s.shift) return;
      // Re-arm the same shift definition AND reset the roster + incidents.
      // (loadShift would reset clock + spawned set, but we also want a clean
      // map — leftover units en_route from a finished shift are confusing.)
      get().returnToLobby();
      get().loadShift(s.shift);
    },
    endShiftNow() {
      const s = get();
      if (!s.shift || s.shift_status !== "running") return;
      const outcome = computeOutcome(s.shift, s.incidents);
      set({ shift_status: "complete", shift_outcome: outcome, paused: true });
    },
    returnToLobby() {
      set((s) => {
        // Reset every unit to its boot-time homebase coord, status=available.
        // No road-graph routing — this is a between-shifts reset, not a sim event.
        const nextUnits = new Map<string, Unit>();
        for (const [id, u] of s.units) {
          const home = s.unit_homebases.get(id) ?? u.current_position;
          nextUnits.set(id, {
            ...u,
            status: "available",
            status_since_game_min: 0,
            current_position: home,
            current_route: undefined,
            route_progress_m: undefined,
            route_total_m: undefined,
            destination_coord: undefined,
            on_arrival: undefined,
            current_incident_id: undefined,
          });
        }
        return {
          shift: null,
          shift_id: null,
          shift_status: "idle",
          shift_outcome: null,
          incidents_spawned: new Set(),
          incidents: new Map(),
          units: nextUnits,
          game_min: 0,
          paused: false,
          selection: null,
          nav_back: [],
          nav_forward: [],
        };
      });
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
