/**
 * Operator Sim — live shift HUD strip.
 *
 * Day 7: on-screen feedback while a shift is in flight. Sits inside TopStrip,
 * shows shift id + tier, spawn progress (X/N filled blocks), running on-time
 * count, time-remaining bar that drains from emerald → amber → crimson as
 * the deadline approaches. Goes hidden when shift_status === "idle".
 */

import { useFloor } from "@/state/useFloor";
import { cn } from "@/lib/cn";

function formatTimeLeft(remaining_game_min: number): string {
  if (remaining_game_min <= 0) return "T-00:00";
  const total_sec = Math.floor(remaining_game_min * 60);
  const m = Math.floor(total_sec / 60);
  const s = total_sec % 60;
  return `T-${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function barTone(fraction_left: number): string {
  if (fraction_left > 0.5) return "bg-accent-emerald";
  if (fraction_left > 0.25) return "bg-accent-amber";
  return "bg-accent-crimson";
}

export function ShiftHUD() {
  const shift = useFloor((s) => s.shift);
  const status = useFloor((s) => s.shift_status);
  const game_min = useFloor((s) => s.game_min);
  const incidents = useFloor((s) => s.incidents);
  const incidents_spawned = useFloor((s) => s.incidents_spawned);

  if (!shift || status === "idle") return null;

  const total = shift.incidents.length;
  const spawned = incidents_spawned.size;
  const remaining = Math.max(0, shift.length_game_min - game_min);
  const fraction_left = remaining / shift.length_game_min;

  // On-time = incidents resolved before their per-incident deadline. Counts
  // running so the player sees their score climb during the shift.
  let on_time = 0;
  for (const si of shift.incidents) {
    const live = incidents.get(si.id);
    if (
      live &&
      live.status === "resolved" &&
      live.resolved_at_game_min !== undefined &&
      live.resolved_at_game_min <= si.spawn_time_game_min + si.resolution_window_game_min
    ) {
      on_time += 1;
    }
  }

  const isComplete = status === "complete";

  return (
    <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border-subtle">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-mute">
        Shift
      </span>
      <span className="font-mono text-[11px] text-fg-bright tabular-nums">{shift.id}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-mute">
        Tier {shift.difficulty_tier}
      </span>

      {/* Spawn progress — N filled tick boxes out of total. */}
      <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "w-2 h-2 border",
              i < spawned
                ? "bg-accent-cyan border-accent-cyan"
                : "border-border-subtle",
            )}
          />
        ))}
        <span className="font-mono text-[10px] text-fg-dim tabular-nums ml-1">
          {spawned}/{total}
        </span>
      </div>

      <span className="font-mono text-[10px] text-accent-emerald tabular-nums">
        ●{on_time} on-time
      </span>

      {/* Time remaining bar — drains as deadline approaches. */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-1 bg-border-subtle relative">
          <div
            className={cn("absolute left-0 top-0 h-full transition-[width] duration-200", barTone(fraction_left))}
            style={{ width: `${Math.min(100, Math.max(0, fraction_left * 100))}%` }}
          />
        </div>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            isComplete ? "text-accent-crimson" : "text-accent-cyan",
          )}
        >
          {isComplete ? "ENDED" : formatTimeLeft(remaining)}
        </span>
      </div>
    </div>
  );
}
