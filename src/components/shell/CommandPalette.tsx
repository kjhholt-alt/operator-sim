/**
 * Operator Sim — command palette.
 *
 * Day 5: backed by `src/sim/verbs.ts`. Each verb declares typed argument
 * slots; the palette surfaces context-aware suggestions per slot and
 * supports Tab-completion. The keyboard-only path through the whole game.
 *
 *   ↑ ↓     navigate suggestions
 *   Tab     apply top (or selected) suggestion
 *   Enter   execute current input
 *   Esc     close
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  applySuggestion,
  executeInput,
  parseInput,
  suggestForInput,
  type Suggestion,
} from "@/sim/verbs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Feedback {
  tone: "ok" | "err";
  text: string;
}

const MAX_SUGGESTIONS = 8;

export function CommandPalette({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset transient state on open/close.
  useEffect(() => {
    if (open) {
      setInput("");
      setHighlighted(0);
      setFeedback(null);
      // Defer focus so the dialog is mounted before we focus the input.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const parsed = useMemo(() => parseInput(input), [input]);
  const suggestions = useMemo(
    () => suggestForInput(parsed).slice(0, MAX_SUGGESTIONS),
    [parsed],
  );

  // Clamp highlight when suggestion list shrinks.
  useEffect(() => {
    if (highlighted >= suggestions.length) {
      setHighlighted(Math.max(0, suggestions.length - 1));
    }
  }, [suggestions.length, highlighted]);

  if (!open) return null;

  function applyTop() {
    const s = suggestions[highlighted];
    if (!s) return;
    const { value } = applySuggestion(input, s);
    setInput(value);
    setHighlighted(0);
    setFeedback(null);
  }

  function commit() {
    const r = executeInput(input);
    setFeedback({ tone: r.ok ? "ok" : "err", text: r.text });
    if (r.ok) {
      setInput("");
      setHighlighted(0);
      // Auto-dismiss on success — keyboard flow is "type, enter, gone".
      setTimeout(() => onOpenChange(false), 350);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(suggestions.length - 1, h + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      applyTop();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start pt-[15vh] bg-bg-base/70 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "w-[680px] max-w-[90vw] bg-bg-panel border border-border-bright shadow-2xl",
          "ring-1 ring-accent-cyan/30",
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* ── Input row ───────────────────────────────────────────── */}
        <div className="border-b border-border-subtle px-3 py-2 flex items-center gap-2">
          <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.22em]">
            Command
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHighlighted(0);
              if (feedback) setFeedback(null);
            }}
            placeholder="dispatch · recall · pause · speed · focus · back"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none border-0 text-fg-bright placeholder:text-fg-mute font-mono text-[13px]"
          />
          <kbd className="font-mono text-[10px] text-fg-mute">TAB</kbd>
          <kbd className="font-mono text-[10px] text-fg-mute">ENTER</kbd>
        </div>

        {/* ── Slot pill row (only when verb identified) ───────────── */}
        {parsed.verb && (
          <div className="border-b border-border-subtle/60 px-3 py-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-[0.18em]">
              {parsed.verb.id}
            </span>
            {parsed.verb.slots.length === 0 && (
              <span className="font-mono text-[10px] text-fg-mute italic">
                no arguments
              </span>
            )}
            {parsed.verb.slots.map((slot, i) => {
              const filled = parsed.tokens[i + 1];
              const isActive = parsed.active_slot === i;
              return (
                <span
                  key={`${slot.name}-${i}`}
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 border tabular-nums",
                    filled
                      ? "border-accent-cyan/40 text-fg-bright bg-accent-cyan/5"
                      : isActive
                        ? "border-accent-amber text-accent-amber"
                        : "border-border-subtle text-fg-mute",
                  )}
                  title={`slot: ${slot.kind}`}
                >
                  {filled ?? `<${slot.name}>`}
                </span>
              );
            })}
            <span className="ml-auto font-mono text-[9px] text-fg-mute uppercase tracking-[0.18em]">
              {parsed.verb.description}
            </span>
          </div>
        )}

        {/* ── Suggestions ─────────────────────────────────────────── */}
        <div className="max-h-[50vh] overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="px-3 py-6 text-center font-mono text-[11px] text-fg-mute uppercase tracking-[0.2em]">
              {parsed.verb && parsed.verb_complete
                ? `no candidates for <${parsed.verb.slots[parsed.active_slot]?.name ?? "?"}>`
                : "no matches"}
            </div>
          ) : (
            <ul role="listbox">
              {suggestions.map((s, i) => (
                <SuggestionRow
                  key={`${s.token}-${i}`}
                  s={s}
                  active={i === highlighted}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => {
                    setHighlighted(i);
                    applyTop();
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* ── Feedback footer ─────────────────────────────────────── */}
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
      </div>
    </div>
  );
}

function SuggestionRow({
  s,
  active,
  onMouseEnter,
  onClick,
}: {
  s: Suggestion;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <li
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "px-3 py-2 cursor-pointer flex items-center justify-between border-b border-border-subtle/40 last:border-b-0",
        active ? "bg-bg-hover text-fg-bright" : "text-fg-base hover:bg-bg-hover",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            active ? "text-accent-cyan" : "text-fg-base",
          )}
        >
          {s.display}
        </span>
      </div>
      {s.trailing && (
        <span className="font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
          {s.trailing}
        </span>
      )}
    </li>
  );
}
