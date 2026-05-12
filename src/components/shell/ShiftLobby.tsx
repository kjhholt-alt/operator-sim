/**
 * Operator Sim — between-shifts lobby panel.
 *
 * Day 9: shown when `shift_status === "idle"`. Lists every shift loaded into
 * `available_shifts` and lets the player arm one. Sits as a centred modal
 * over the dimmed map so the watch-floor aesthetic is preserved.
 *
 *   Esc / click outside    no-op (lobby is not dismissible — the player MUST
 *                          pick a shift to drive the world)
 */

import { useFloor } from "@/state/useFloor";
import { cn } from "@/lib/cn";

export function ShiftLobby() {
  const status = useFloor((s) => s.shift_status);
  const outcome = useFloor((s) => s.shift_outcome);
  const shifts = useFloor((s) => s.available_shifts);
  const loadShift = useFloor((s) => s.loadShift);

  // Render only in the idle state — and only when the post-shift summary has
  // been dismissed (so we don't double-stack with ShiftSummary on completion).
  if (status !== "idle" || outcome) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg-base/80 backdrop-blur-sm">
      <div
        className={cn(
          "w-[640px] max-w-[92vw] bg-bg-panel border border-border-bright shadow-2xl",
          "ring-1 ring-accent-cyan/20",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border-subtle px-4 py-3 flex items-center gap-3">
          <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.22em]">
            Shift Lobby
          </span>
          <span className="font-mono text-[10px] text-fg-mute">
            select a shift to begin
          </span>
          <span className="ml-auto font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
            {shifts.length} available
          </span>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {shifts.length === 0 ? (
            <div className="px-4 py-6 text-center font-mono text-[11px] text-fg-mute uppercase tracking-[0.2em]">
              no shifts loaded — boot must hydrate available_shifts
            </div>
          ) : (
            <ul>
              {shifts.map((sh, i) => (
                <li
                  key={sh.id}
                  className={cn(
                    "border-b border-border-subtle/40 last:border-b-0 px-4 py-3 cursor-pointer",
                    "flex items-start gap-4 hover:bg-bg-hover",
                  )}
                  onClick={() => loadShift(sh)}
                >
                  <div
                    className={cn(
                      "w-8 h-8 grid place-items-center font-mono text-[14px] tabular-nums shrink-0 border",
                      sh.difficulty_tier <= 1
                        ? "text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10"
                        : sh.difficulty_tier <= 3
                          ? "text-accent-amber border-accent-amber/40 bg-accent-amber/10"
                          : "text-accent-crimson border-accent-crimson/40 bg-accent-crimson/10",
                    )}
                    title={`Tier ${sh.difficulty_tier}`}
                  >
                    T{sh.difficulty_tier}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <span className="font-mono text-[12px] text-fg-bright tabular-nums">
                        {sh.id}
                      </span>
                      <span className="font-mono text-[9px] text-fg-mute uppercase tracking-[0.18em]">
                        {sh.length_game_min} min · {sh.incidents.length} incidents
                      </span>
                    </div>
                    {sh.notes && (
                      <div className="text-[11px] text-fg-dim leading-relaxed line-clamp-3 mb-1">
                        {sh.notes}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {sh.incidents.slice(0, 8).map((si) => (
                        <span
                          key={si.id}
                          className="font-mono text-[9px] text-fg-mute uppercase tracking-[0.16em] border border-border-subtle px-1.5 py-0.5"
                          title={`${si.id} — ${si.severity}`}
                        >
                          {si.type.replace(/_/g, " ")}
                        </span>
                      ))}
                      {sh.incidents.length > 8 && (
                        <span className="font-mono text-[9px] text-fg-mute">
                          +{sh.incidents.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.18em] self-center">
                    start →
                  </div>
                  <span className="sr-only">{i}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-4 py-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
            ctrl+k → <kbd className="text-fg-base">start</kbd> to arm via palette
          </span>
          <span className="font-mono text-[10px] text-fg-dim uppercase tracking-[0.18em]">
            roster · 8 units · 2 stations
          </span>
        </div>
      </div>
    </div>
  );
}
