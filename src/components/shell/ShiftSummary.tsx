/**
 * Operator Sim — end-of-shift summary modal.
 *
 * Day 6: appears once `useFloor.shift_status === "complete"` and the outcome
 * has been computed by the tick loop. Tier-1 shifts target a 90 % in-window
 * resolution rate — the grade chip turns S/A green, B/C amber, D crimson.
 *
 *   Esc       dismiss (sticks shift_status: complete; world stays paused)
 */

import { useEffect } from "react";
import { useFloor } from "@/state/useFloor";
import { cn } from "@/lib/cn";
import type { IncidentResult, ShiftGrade } from "@/sim/shift";

const GRADE_TONE: Record<ShiftGrade, string> = {
  S: "text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10",
  A: "text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10",
  B: "text-accent-amber border-accent-amber/40 bg-accent-amber/10",
  C: "text-accent-amber border-accent-amber/40 bg-accent-amber/10",
  D: "text-accent-crimson border-accent-crimson/40 bg-accent-crimson/10",
};

const OUTCOME_LABEL: Record<IncidentResult["outcome"], string> = {
  resolved_in_window: "ON TIME",
  resolved_late: "LATE",
  missed: "MISSED",
  cancelled: "CANCELLED",
};

const OUTCOME_TONE: Record<IncidentResult["outcome"], string> = {
  resolved_in_window: "text-accent-emerald",
  resolved_late: "text-accent-amber",
  missed: "text-accent-crimson",
  cancelled: "text-fg-mute",
};

export function ShiftSummary() {
  const outcome = useFloor((s) => s.shift_outcome);
  const dismiss = useFloor((s) => s.dismissShiftOutcome);

  useEffect(() => {
    if (!outcome) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [outcome, dismiss]);

  if (!outcome) return null;

  const pct = (outcome.score * 100).toFixed(0);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-bg-base/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className={cn(
          "w-[640px] max-w-[92vw] bg-bg-panel border border-border-bright shadow-2xl",
          "ring-1 ring-accent-cyan/20",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header row ──────────────────────────────────────────── */}
        <div className="border-b border-border-subtle px-4 py-3 flex items-center gap-3">
          <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.22em]">
            End of Shift
          </span>
          <span className="font-mono text-[10px] text-fg-mute">{outcome.shift_id}</span>
          <span className="ml-auto font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
            score {pct}%
          </span>
        </div>

        {/* ── Grade + counts row ──────────────────────────────────── */}
        <div className="px-4 py-4 flex items-stretch gap-4 border-b border-border-subtle">
          <div
            className={cn(
              "w-20 h-20 grid place-items-center border font-mono text-[44px] font-bold tabular-nums",
              GRADE_TONE[outcome.grade],
            )}
          >
            {outcome.grade}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Stat label="On time" value={outcome.resolved_in_window} tone="text-accent-emerald" />
            <Stat label="Late" value={outcome.resolved_late} tone="text-accent-amber" />
            <Stat label="Missed" value={outcome.missed} tone="text-accent-crimson" />
            <Stat label="Total" value={outcome.total} tone="text-fg-bright" />
          </div>
        </div>

        {/* ── Per-incident table ──────────────────────────────────── */}
        <div className="max-h-[40vh] overflow-y-auto">
          <table className="w-full text-[11px] font-mono tabular-nums">
            <thead>
              <tr className="text-fg-mute uppercase tracking-[0.18em] text-[9px]">
                <th className="text-left px-4 py-1.5 font-normal">Incident</th>
                <th className="text-left px-2 py-1.5 font-normal">Type</th>
                <th className="text-left px-2 py-1.5 font-normal">Sev</th>
                <th className="text-right px-2 py-1.5 font-normal">Spawn</th>
                <th className="text-right px-2 py-1.5 font-normal">Due</th>
                <th className="text-right px-2 py-1.5 font-normal">Resolved</th>
                <th className="text-right px-4 py-1.5 font-normal">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {outcome.per_incident.map((r) => (
                <tr key={r.shift_incident_id} className="border-t border-border-subtle/40">
                  <td className="px-4 py-1.5 text-fg-base">{r.shift_incident_id}</td>
                  <td className="px-2 py-1.5 text-fg-dim">{r.type}</td>
                  <td className="px-2 py-1.5 text-fg-dim uppercase">{r.severity}</td>
                  <td className="px-2 py-1.5 text-right text-fg-dim">
                    T+{r.spawned_at_game_min.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-fg-dim">
                    T+{r.resolution_due_by_game_min.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-fg-dim">
                    {r.resolved_at_game_min !== undefined
                      ? `T+${r.resolved_at_game_min.toFixed(1)}`
                      : "—"}
                  </td>
                  <td className={cn("px-4 py-1.5 text-right uppercase tracking-[0.16em]", OUTCOME_TONE[r.outcome])}>
                    {OUTCOME_LABEL[r.outcome]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="border-t border-border-subtle px-4 py-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
            press <kbd className="text-fg-base">ESC</kbd> or click outside to close
          </span>
          <button
            onClick={dismiss}
            className="font-mono text-[11px] text-accent-cyan border border-accent-cyan/30 px-3 py-1 hover:bg-accent-cyan/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="border border-border-subtle px-3 py-1.5 flex items-center justify-between">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-mute">{label}</span>
      <span className={cn("font-mono text-[18px] tabular-nums", tone)}>{value}</span>
    </div>
  );
}
