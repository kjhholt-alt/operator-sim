/**
 * Operator Sim — Saves panel (Day 14).
 *
 * Renders the cached `available_saves` list. Click a row to restore
 * that snapshot (calls executeInput so the verb's logEvent + cache
 * refresh path runs). The trash button forgets a slot.
 *
 * Mounted inside ShiftLobby — saves are most useful between shifts —
 * but stays out of the running shift HUD to avoid clutter. To save or
 * restore mid-shift, use Ctrl+K → `save <name>` / `replay <id>`.
 */

import { useFloor } from "@/state/useFloor";
import { executeInput } from "@/sim/verbs";
import { cn } from "@/lib/cn";

function formatTimestamp(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function SavesPanel() {
  const saves = useFloor((s) => s.available_saves);

  if (saves.length === 0) {
    return (
      <div className="border-t border-border-subtle px-4 py-3 text-center font-mono text-[10px] text-fg-mute uppercase tracking-[0.2em]">
        no saved snapshots — use <kbd className="text-fg-dim">ctrl+k</kbd>{" "}
        <kbd className="text-fg-dim">save &lt;name&gt;</kbd> mid-run
      </div>
    );
  }

  return (
    <div className="border-t border-border-subtle">
      <div className="px-4 py-2 flex items-center gap-3 border-b border-border-subtle/60">
        <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.22em]">
          Saved Snapshots
        </span>
        <span className="ml-auto font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
          {saves.length} slot{saves.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="max-h-[28vh] overflow-y-auto">
        {saves.map((slot) => (
          <li
            key={slot.id}
            className={cn(
              "border-b border-border-subtle/40 last:border-b-0 px-4 py-2.5 flex items-center gap-3",
              "hover:bg-bg-hover",
            )}
          >
            <div
              className="w-7 h-7 grid place-items-center font-mono text-[11px] tabular-nums shrink-0 border text-fg-bright border-border-bright bg-bg-base/60"
              title={`Tier ${slot.difficulty_tier}`}
            >
              T{slot.difficulty_tier || "-"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[11px] text-fg-bright truncate">
                {slot.name}
              </div>
              <div className="font-mono text-[9px] text-fg-mute uppercase tracking-[0.16em]">
                {slot.id} · {slot.game_min_total.toFixed(1)}min · saved {formatTimestamp(slot.saved_at)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => executeInput(`replay ${slot.id}`)}
              className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.18em] px-2 py-1 border border-accent-cyan/40 hover:bg-accent-cyan/10"
            >
              replay
            </button>
            <button
              type="button"
              onClick={() => executeInput(`forget ${slot.id}`)}
              title="delete this save"
              className="font-mono text-[10px] text-fg-dim uppercase tracking-[0.18em] px-2 py-1 border border-border-subtle hover:text-accent-crimson hover:border-accent-crimson/40"
            >
              forget
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
