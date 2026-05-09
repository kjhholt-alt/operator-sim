/**
 * Operator Sim — wall-clock tick loop.
 *
 * Drives `tickStep()` against the floor store via requestAnimationFrame.
 * Real-to-game-time ratio: 4 real seconds = 1 game minute at 1× speed, so a
 * 12-game-min Tier-1 shift takes ~48 real seconds. Adjustable per shift later.
 *
 * Idempotent start/stop. Calling startTickLoop() while already running is safe.
 */

import { useFloor } from "@/state/useFloor";
import { tickStep } from "./dispatch";

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
      const units = new Map(s.units);
      const incidents = new Map(s.incidents);
      const events: string[] = [];
      tickStep(delta_game_min, {
        game_min: s.game_min + delta_game_min,
        units,
        incidents,
        road_graph: s.road_graph,
        addresses: s.addresses,
        stations: s.stations,
        events,
      });
      // Commit one setState per frame — minimises React re-renders.
      useFloor.setState({
        game_min: s.game_min + delta_game_min,
        units,
        incidents,
      });
      for (const e of events) s.logEvent(e);
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
