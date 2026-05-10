/**
 * Operator Sim — bottom radio ticker.
 *
 * Day 12: ported from the claude.ai/design "Operator Sim Watchfloor"
 * handoff. The ticker is now a continuously-scrolling chatter strip
 * rather than a single line of last-text. Events are tagged by their
 * leading verb (dispatch / arrival / route / etc) and tinted to match.
 *
 * The track is duplicated so the CSS keyframe (`bt-roll`) can loop
 * seamlessly via `transform: translateX(-50%)`. Hovering pauses scroll.
 */

import { useMemo, useState } from "react";
import { useFloor } from "@/state/useFloor";
import { cn } from "@/lib/cn";

interface TickerEvent {
  game_min: number;
  text: string;
  kind: TickerKind;
  key: string;
}

type TickerKind =
  | "incoming"
  | "arrival"
  | "route"
  | "dispatch"
  | "radio"
  | "rts"
  | "system"
  | "alarm"
  | "bolo"
  | "weather"
  | "resolved"
  | "default";

/**
 * Infer the tag kind from the leading verb of an event line. Keep this
 * in sync with sim/dispatch.ts + sim/shift.ts + sim/tick.ts log strings.
 */
function classifyEvent(text: string): TickerKind {
  const head = text.split(/[\s·]/, 1)[0]?.toLowerCase() ?? "";
  switch (head) {
    case "incoming": return "incoming";
    case "dispatch": return "dispatch";
    case "engaged": return "route";
    case "on_scene": return "arrival";
    case "resolved": return "resolved";
    case "available": return "rts";
    case "return": return "rts";
    case "spawn": return "system";
    case "shift": return "system";
    case "bolo": return "bolo";
    case "weather": return "weather";
    case "alarm": return "alarm";
    default: return "default";
  }
}

function fmtT(game_min: number): string {
  const total = Math.floor(game_min * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function BottomTicker() {
  const log = useFloor((s) => s.last_event_log);
  const game_min = useFloor((s) => s.game_min);
  const [hovered, setHovered] = useState(false);

  // Events are stored newest-first; reverse so the ticker reads
  // chronologically left → right (older → newer).
  const events = useMemo<TickerEvent[]>(() => {
    if (log.length === 0) {
      return [
        {
          game_min,
          text: "channel cold · no traffic — Ctrl+K to open command palette",
          kind: "system" as const,
          key: "idle",
        },
      ];
    }
    // Take the last 24 lines (oldest of those at left, newest at right).
    return log
      .slice(0, 24)
      .map((e, i) => ({
        game_min: e.game_min,
        text: e.text,
        kind: classifyEvent(e.text),
        key: `${e.ts}-${i}`,
      }))
      .reverse();
  }, [log, game_min]);

  // Duplicate the track so the -50% translation can loop seamlessly.
  const doubled = useMemo(() => events.concat(events.map((e) => ({ ...e, key: e.key + ":dup" }))), [events]);

  return (
    <footer
      className="bottom-ticker h-8 border-t border-border-subtle bg-bg-panel flex items-center px-3 gap-3 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="opsim-pulse w-1.5 h-1.5 rounded-full bg-accent-cyan inline-block" />
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">Radio</span>
        <span className="font-mono text-[10px] tabular-nums text-accent-cyan">CH-1</span>
      </div>

      <div className="bt-track-wrap">
        <div className={cn("bt-track", hovered && "is-paused")}>
          {doubled.map((e) => (
            <span key={e.key} className="bt-event">
              <span className="font-mono text-[10px] tabular-nums text-accent-cyan">T+{fmtT(e.game_min)}</span>
              <span className={cn("bt-tag", `tag-${e.kind}`)}>{e.kind}</span>
              <span className="font-mono text-[10px] text-fg-base">{e.text}</span>
              <span className="bt-sep">·</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <span className="font-mono text-[10px] text-fg-mute">Build</span>
        <span className="font-mono text-[10px] text-fg-dim tabular-nums">v0.0.12-day12</span>
        <span className="bt-sep">·</span>
        <kbd className="font-mono text-[9px] px-1.5 py-0.5 bg-bg-elev border border-border-subtle text-fg-base tracking-[0.1em]">
          Ctrl+K
        </kbd>
        <span className="font-mono text-[10px] text-fg-mute">command</span>
      </div>
    </footer>
  );
}
