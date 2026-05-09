import { useState } from "react";
import { Command } from "cmdk";
import { cn } from "@/lib/cn";
import { useFloor } from "@/state/useFloor";
import { dispatch, sendHome } from "@/sim/dispatch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VERBS = [
  { id: "dispatch", label: "dispatch unit to incident", hint: "dispatch E1 i_2031" },
  { id: "recall", label: "recall unit", hint: "recall E1" },
  { id: "pause", label: "toggle pause", hint: "pause" },
  { id: "speed", label: "set sim speed", hint: "speed 2" },
  { id: "focus", label: "focus map on entity", hint: "focus E1" },
];

interface Feedback {
  tone: "ok" | "err";
  text: string;
}

function execute(input: string): Feedback {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { tone: "err", text: "empty command" };

  const [verb, ...args] = parts;
  const v = verb.toLowerCase();

  if (v === "dispatch") {
    if (args.length < 2) return { tone: "err", text: "usage: dispatch <unit> <incident>" };
    const r = dispatch(args[0], args[1]);
    return r.ok
      ? { tone: "ok", text: `${args[0]} → ${args[1]} · ${(r.route_m / 1000).toFixed(2)} km` }
      : { tone: "err", text: r.reason };
  }

  if (v === "recall") {
    if (args.length < 1) return { tone: "err", text: "usage: recall <unit>" };
    const s = useFloor.getState();
    const upper = args[0].toUpperCase();
    let id: string | null = null;
    if (s.units.has(args[0])) id = args[0];
    else for (const u of s.units.values()) if (u.callsign.toUpperCase() === upper) id = u.id;
    if (!id) return { tone: "err", text: `unknown unit ${args[0]}` };
    const r = sendHome(id);
    return r.ok
      ? { tone: "ok", text: `${args[0]} returning · ${(r.route_m / 1000).toFixed(2)} km` }
      : { tone: "err", text: r.reason };
  }

  if (v === "pause") {
    useFloor.getState().togglePause();
    return { tone: "ok", text: useFloor.getState().paused ? "paused" : "resumed" };
  }

  if (v === "speed") {
    const n = Number(args[0]);
    if (!Number.isFinite(n)) return { tone: "err", text: "usage: speed 0|0.5|1|2|4" };
    const allowed: ReadonlyArray<0 | 0.5 | 1 | 2 | 4> = [0, 0.5, 1, 2, 4];
    const match = allowed.find((x) => x === n);
    if (match === undefined) return { tone: "err", text: "speed must be 0, 0.5, 1, 2, or 4" };
    useFloor.getState().setSpeed(match);
    return { tone: "ok", text: `speed = ${match}×` };
  }

  if (v === "focus") {
    if (args.length < 1) return { tone: "err", text: "usage: focus <unit-callsign>" };
    const s = useFloor.getState();
    const upper = args[0].toUpperCase();
    for (const u of s.units.values()) {
      if (u.callsign.toUpperCase() === upper) {
        s.setCamera({ center: u.current_position, zoom: 15 });
        s.select({ kind: "unit", id: u.id });
        return { tone: "ok", text: `focused ${u.callsign}` };
      }
    }
    return { tone: "err", text: `no unit ${args[0]}` };
  }

  return { tone: "err", text: `unknown verb ${v}` };
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && input.trim().length > 0) {
      const fb = execute(input);
      setFeedback(fb);
      if (fb.tone === "ok") {
        setInput("");
        // Auto-dismiss palette on successful command for fast keyboard flow.
        setTimeout(() => onOpenChange(false), 300);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start pt-[15vh] bg-bg-base/70 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "w-[640px] max-w-[90vw] bg-bg-panel border border-border-bright shadow-2xl",
          "ring-1 ring-accent-cyan/30",
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="border-b border-border-subtle px-3 py-2 flex items-center gap-2">
            <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.22em]">
              Command
            </span>
            <Command.Input
              placeholder="dispatch E1 i_2031 · recall E1 · pause · speed 2"
              className="flex-1 bg-transparent outline-none border-0 text-fg-bright placeholder:text-fg-mute font-mono text-[13px]"
              autoFocus
              value={input}
              onValueChange={setInput}
            />
            <kbd className="font-mono text-[10px] text-fg-mute">ENTER</kbd>
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto">
            <Command.Empty className="px-3 py-6 text-center font-mono text-[11px] text-fg-mute uppercase tracking-[0.2em]">
              no matches
            </Command.Empty>
            <Command.Group heading="VERBS" className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-mute px-3 pt-2">
              {VERBS.map((v) => (
                <Command.Item
                  key={v.id}
                  value={`${v.id} ${v.label}`}
                  onSelect={() => setInput(`${v.id} `)}
                  className={cn(
                    "px-3 py-2 cursor-pointer flex items-center justify-between",
                    "text-fg-base data-[selected=true]:bg-bg-hover data-[selected=true]:text-fg-bright",
                    "border-b border-border-subtle/50 last:border-b-0",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.18em] w-24">
                      {v.id}
                    </span>
                    <span className="text-[12px] text-fg-base">{v.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-fg-mute">{v.hint}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          {feedback && (
            <div
              className={cn(
                "border-t border-border-subtle px-3 py-2 font-mono text-[11px] tabular-nums",
                feedback.tone === "ok" ? "text-accent-emerald" : "text-accent-crimson",
              )}
            >
              {feedback.tone === "ok" ? "✓" : "✗"} {feedback.text}
            </div>
          )}
        </Command>
      </div>
    </div>
  );
}
