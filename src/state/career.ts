/**
 * Operator Sim — career progress (Day 14).
 *
 * Tracks which shift IDs the player has finished. Persists to Dexie
 * (`progress` table, one singleton row). The lobby reads `career_progress`
 * from the floor store to decide what's locked/unlocked.
 *
 * Progression rule (Day 14):
 *   Shifts are sorted by difficulty_tier. A shift unlocks once every
 *   earlier shift in the chain has been completed at least once. Tier 1
 *   is always unlocked. Police shifts (tier 2) unlock once tier 1 is
 *   cleared, in parallel with the standard tier 2.
 *
 * The completion hook (subscribeShiftCompletion) is the *only* writer
 * outside tests — it watches shift_status transitions and persists the
 * shift id when running → complete.
 */

import { db } from "./db";
import { useFloor } from "./useFloor";

const PROGRESS_ROW_ID = "default";

export interface CareerSnapshot {
  completed_shift_ids: string[];
  last_completed_at: string | null;
}

const EMPTY: CareerSnapshot = { completed_shift_ids: [], last_completed_at: null };

/**
 * Load the persisted career progress. Returns an empty snapshot if no
 * row exists yet (first run).
 */
export async function loadCareerProgress(): Promise<CareerSnapshot> {
  const row = await db.progress.get(PROGRESS_ROW_ID);
  if (!row) return { ...EMPTY };
  return {
    completed_shift_ids: [...row.completed_shift_ids],
    last_completed_at: row.last_completed_at,
  };
}

/**
 * Mark a shift as completed and persist. Idempotent — re-completing the
 * same shift doesn't duplicate the id.
 */
export async function markShiftComplete(shiftId: string): Promise<CareerSnapshot> {
  const current = await loadCareerProgress();
  const set = new Set(current.completed_shift_ids);
  set.add(shiftId);
  const next: CareerSnapshot = {
    completed_shift_ids: Array.from(set),
    last_completed_at: new Date().toISOString(),
  };
  await db.progress.put({ id: PROGRESS_ROW_ID, ...next });
  useFloor.getState().setCareerProgress(next);
  return next;
}

/**
 * Wipe the persisted career. Test helper + future "reset career" verb.
 */
export async function resetCareerProgress(): Promise<void> {
  await db.progress.delete(PROGRESS_ROW_ID);
  useFloor.getState().setCareerProgress({ ...EMPTY });
}

/**
 * Compute which shift ids should be unlocked given the available shifts
 * list and the current completion set. Pure — testable without Dexie.
 *
 * Rule: order shifts by difficulty_tier (then id for stability). A shift
 * is unlocked iff every earlier shift of strictly lower tier has been
 * completed. Shifts within the same tier all unlock together once the
 * previous tier is cleared. Tier 1 is always unlocked.
 */
export function computeUnlockedShifts(
  available: Array<{ id: string; difficulty_tier: number }>,
  completedIds: ReadonlyArray<string>,
): Set<string> {
  const completed = new Set(completedIds);
  const tiers = Array.from(new Set(available.map((s) => s.difficulty_tier))).sort((a, b) => a - b);
  const tierCleared = new Map<number, boolean>();
  for (const t of tiers) {
    const shiftsAtTier = available.filter((s) => s.difficulty_tier === t);
    tierCleared.set(t, shiftsAtTier.every((s) => completed.has(s.id)));
  }
  const unlocked = new Set<string>();
  for (const shift of available) {
    const previousTiers = tiers.filter((t) => t < shift.difficulty_tier);
    const previousAllCleared = previousTiers.every((t) => tierCleared.get(t) === true);
    if (previousAllCleared) unlocked.add(shift.id);
  }
  return unlocked;
}

/**
 * Subscribe to shift completion transitions. Returns the unsubscribe
 * function. Called once at boot from seed.ts.
 *
 * The subscription captures the previous shift_status alongside the new
 * one so we only fire when running → complete (not when complete →
 * idle on returnToLobby, etc).
 */
export function subscribeShiftCompletion(): () => void {
  let prevStatus = useFloor.getState().shift_status;
  return useFloor.subscribe((s) => {
    const nextStatus = s.shift_status;
    if (prevStatus === "running" && nextStatus === "complete" && s.shift_id) {
      // Fire-and-forget; the snapshot lands in floor on resolve.
      void markShiftComplete(s.shift_id);
    }
    prevStatus = nextStatus;
  });
}
