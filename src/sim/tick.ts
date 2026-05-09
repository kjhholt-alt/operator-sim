/**
 * Operator Sim — wall-clock tick loop.
 *
 * Drives `tickStep()` against the floor store via requestAnimationFrame.
 * Real-to-game-time ratio: 4 real seconds = 1 game minute at 1× speed, so a
 * 12-game-min Tier-1 shift takes ~48 real seconds. Adjustable per shift later.
 *
 * Day 6: between FSM step and commit, we (a) advance the shift spawn timeline
 * and (b) detect end-of-shift to score the run.
 *
 * Idempotent start/stop. Calling startTickLoop() while already running is safe.
 */

import { useFloor } from "@/state/useFloor";
import { tickStep } from "./dispatch";
import { computeOutcome, spawnDueIncidents } from "./shift";

export const REAL_MS_PER_GAME_MIN = 4_000;

let rafId: number | null = null;
let lastRealMs: number | null = null;

function frame(): void {
  const now = performance.now();
  if (lastRealMs === null) lastRealMs = now;
  const realDelta = Math.min(now - lastRealMs, 1_000); // cap big stalls
  lastRealMs = now;

  const s = useFloor.getState();
  if (!s.paused && s.speed > 0 && realDelta > 0) {
    const delta_game_min = (realDelta / REAL_MS_PER_GAME_MIN) * s.speed;
    if (delta_game_min > 0) {
      const next_game_min = s.game_min + delta_game_min;
      const units = new Map(s.units);
      const incidents = new Map(s.incidents);
      const events: string[] = [];

      // ── core FSM ──
      tickStep(delta_game_min, {
        game_min: next_game_min,
        units,
        incidents,
        road_graph: s.road_graph,
        addresses: s.addresses,
        stations: s.stations,
        vehicles: s.vehicles,
        events,
      });

      // ── shift spawn timeline ──
      let next_spawned = s.incidents_spawned;
      if (s.shift && s.shift_status === "running") {
        const due = spawnDueIncidents(
          s.shift,
          next_game_min,
          s.incidents_spawned,
          s.addresses,
        );
        if (due.spawned_ids.length > 0) {
          for (const inc of due.incidents) incidents.set(inc.id, inc);
          for (const e of due.events) events.push(e);
          next_spawned = new Set(s.incidents_spawned);
          for (const id of due.spawned_ids) next_spawned.add(id);
        }
      }

      // ── commit one setState per frame ──
      useFloor.setState({
        game_min: next_game_min,
        units,
        incidents,
        incidents_spawned: next_spawned,
      });
      for (const e of events) s.logEvent(e);

      // ── end-of-shift detection ──
      if (
        s.shift &&
        s.shift_status === "running" &&
        next_game_min >= s.shift.length_game_min
      ) {
        const outcome = computeOutcome(s.shift, incidents);
        s.completeShift(outcome);
        s.logEvent(
          `shift complete · grade ${outcome.grade} · ${outcome.resolved_in_window}/${outcome.total} on time`,
        );
      }
    }
  }

  rafId = requestAnimationFrame(frame);
}

export function startTickLoop(): void {
  if (rafId !== null) return;
  lastRealMs = null;
  rafId = requestAnimationFrame(frame);
}

export function stopTickLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastRealMs = null;
}
