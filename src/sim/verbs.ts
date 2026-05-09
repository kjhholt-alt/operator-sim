/**
 * Operator Sim — verb registry.
 *
 * The cmdk command palette (Ctrl+K) is the keyboard-only path through the
 * whole game. Every verb is declared here with typed argument slots so the
 * palette can autocomplete each slot from live store state, filter by
 * relevance, and reject malformed commands BEFORE execute.
 *
 * Day 5 scope: dispatch / recall / pause / speed / focus / select / back /
 * forward / clear-selection. Day 6 adds hire/fire/place_station/etc.
 */

import { useFloor } from "@/state/useFloor";
import { dispatch, sendHome } from "./dispatch";
import type { EntityKind, Incident, Unit } from "@/lib/schemas";

// ── Slots ──────────────────────────────────────────────────────────────

export type Slot =
  | {
      name: string;
      kind: "unit";
      // Optional filter — e.g. dispatch only suggests `available` units.
      filter?: (u: Unit) => boolean;
    }
  | {
      name: string;
      kind: "incident";
      filter?: (i: Incident) => boolean;
    }
  | {
      name: string;
      kind: "literal";
      values: readonly string[];
    }
  | {
      name: string;
      kind: "speed";
    }
  | {
      name: string;
      kind: "kind"; // an EntityKind value
    };

export interface Suggestion {
  /** Token to insert into the input on Tab. */
  token: string;
  /** Human-friendly display string for the dropdown row. */
  display: string;
  /** Optional muted trailing string (status, kind, etc.). */
  trailing?: string;
}

// ── Verb declarations ─────────────────────────────────────────────────

export type VerbResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export interface Verb {
  id: string;
  label: string;
  description: string;
  slots: Slot[];
  run: (args: string[]) => VerbResult;
}

const SPEED_VALUES = ["0.5", "1", "2", "4"] as const;

// dispatch <unit:available> <incident:active>
const dispatchVerb: Verb = {
  id: "dispatch",
  label: "dispatch unit to incident",
  description: "Send an available unit to an active incident on the road graph.",
  slots: [
    { name: "unit", kind: "unit", filter: (u) => u.status === "available" },
    {
      name: "incident",
      kind: "incident",
      filter: (i) => i.status !== "resolved" && i.status !== "cancelled",
    },
  ],
  run: ([unitArg, incArg]) => {
    const r = dispatch(unitArg, incArg);
    return r.ok
      ? { ok: true, text: `${unitArg} → ${incArg} · ${(r.route_m / 1000).toFixed(2)} km` }
      : { ok: false, reason: r.reason };
  },
};

// recall <unit: anything but available>
const recallVerb: Verb = {
  id: "recall",
  label: "recall unit to homebase",
  description: "Send a unit back to its homebase station.",
  slots: [
    {
      name: "unit",
      kind: "unit",
      filter: (u) => u.status !== "available" && u.status !== "out_of_service",
    },
  ],
  run: ([unitArg]) => {
    const s = useFloor.getState();
    const upper = unitArg.toUpperCase();
    let id: string | null = null;
    if (s.units.has(unitArg)) id = unitArg;
    else for (const u of s.units.values()) if (u.callsign.toUpperCase() === upper) id = u.id;
    if (!id) return { ok: false, reason: `unknown unit ${unitArg}` };
    const r = sendHome(id);
    return r.ok
      ? { ok: true, text: `${unitArg} returning · ${(r.route_m / 1000).toFixed(2)} km` }
      : { ok: false, reason: r.reason };
  },
};

const pauseVerb: Verb = {
  id: "pause",
  label: "toggle pause",
  description: "Pause or resume the simulation tick loop.",
  slots: [],
  run: () => {
    useFloor.getState().togglePause();
    return { ok: true, text: useFloor.getState().paused ? "paused" : "resumed" };
  },
};

const speedVerb: Verb = {
  id: "speed",
  label: "set sim speed",
  description: "Set the wall-clock speed multiplier.",
  slots: [{ name: "multiplier", kind: "speed" }],
  run: ([arg]) => {
    const n = Number(arg);
    if (!SPEED_VALUES.includes(arg as typeof SPEED_VALUES[number])) {
      return { ok: false, reason: `speed must be one of ${SPEED_VALUES.join(", ")}` };
    }
    useFloor.getState().setSpeed(n as 0.5 | 1 | 2 | 4);
    return { ok: true, text: `speed = ${n}×` };
  },
};

// focus <unit OR incident> — camera + selection
const focusVerb: Verb = {
  id: "focus",
  label: "focus map on entity",
  description: "Centre the camera on a unit or incident and select it.",
  slots: [{ name: "target", kind: "unit" }],
  run: ([arg]) => {
    const s = useFloor.getState();
    const upper = arg.toUpperCase();
    for (const u of s.units.values()) {
      if (u.callsign.toUpperCase() === upper || u.id === arg) {
        s.setCamera({ center: u.current_position, zoom: 15 });
        s.select({ kind: "unit", id: u.id });
        return { ok: true, text: `focused ${u.callsign}` };
      }
    }
    for (const i of s.incidents.values()) {
      if (i.id === arg) {
        const addr = s.addresses.get(i.address_id);
        if (addr) s.setCamera({ center: addr.coord, zoom: 15 });
        s.select({ kind: "incident", id: i.id });
        return { ok: true, text: `focused ${i.id}` };
      }
    }
    return { ok: false, reason: `no unit or incident ${arg}` };
  },
};

const backVerb: Verb = {
  id: "back",
  label: "navigate dossier back",
  description: "Pop the right-rail selection history. Same as Alt+Left.",
  slots: [],
  run: () => {
    const before = useFloor.getState().nav_back.length;
    useFloor.getState().goBack();
    if (useFloor.getState().nav_back.length === before) {
      return { ok: false, reason: "nothing to go back to" };
    }
    return { ok: true, text: "← back" };
  },
};

const forwardVerb: Verb = {
  id: "forward",
  label: "navigate dossier forward",
  description: "Redo a previously back-navigated dossier. Same as Alt+Right.",
  slots: [],
  run: () => {
    const before = useFloor.getState().nav_forward.length;
    useFloor.getState().goForward();
    if (useFloor.getState().nav_forward.length === before) {
      return { ok: false, reason: "nothing ahead" };
    }
    return { ok: true, text: "→ forward" };
  },
};

const clearSelectionVerb: Verb = {
  id: "clear",
  label: "clear right-rail selection",
  description: "Drop the current dossier and wipe nav history.",
  slots: [],
  run: () => {
    useFloor.getState().clearNav();
    return { ok: true, text: "cleared" };
  },
};

export const VERBS: readonly Verb[] = [
  dispatchVerb,
  recallVerb,
  focusVerb,
  pauseVerb,
  speedVerb,
  backVerb,
  forwardVerb,
  clearSelectionVerb,
];

// ── Parsing ────────────────────────────────────────────────────────────

export interface ParsedInput {
  raw: string;
  tokens: string[];
  // Index of the slot the cursor is currently editing. -1 = the verb itself
  // is still being typed (no trailing space yet, and at most one token).
  active_slot: number;
  /** The matched verb, if `tokens[0]` resolves to one. */
  verb: Verb | null;
  /** True if the user has finished typing the verb (verb + trailing space). */
  verb_complete: boolean;
}

export function parseInput(raw: string): ParsedInput {
  const trimmed = raw.replace(/\s+$/g, "");
  const trailingSpace = raw.length > 0 && /\s$/.test(raw);
  const tokens = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
  if (tokens.length === 0) {
    return { raw, tokens, active_slot: -1, verb: null, verb_complete: false };
  }
  const verb = VERBS.find((v) => v.id === tokens[0].toLowerCase()) ?? null;
  const verb_complete = !!verb && (tokens.length > 1 || trailingSpace);
  let active_slot = -1;
  if (verb && verb_complete) {
    const argTokens = tokens.length - 1; // tokens after the verb
    if (trailingSpace) {
      // Cursor is positioned at the next slot.
      active_slot = argTokens;
    } else {
      // Cursor is editing the most recent token.
      active_slot = Math.max(0, argTokens - 1);
    }
  }
  return { raw, tokens, active_slot, verb, verb_complete };
}

// ── Suggestions ────────────────────────────────────────────────────────

/**
 * Suggestions for the current input. If the verb isn't typed yet, suggests
 * verbs. If the verb is typed but a slot is being edited, suggests entities
 * filtered by the slot definition + the partial token already typed.
 */
export function suggestForInput(parsed: ParsedInput): Suggestion[] {
  // Stage 1: verb autocomplete.
  if (!parsed.verb || !parsed.verb_complete) {
    const partial = (parsed.tokens[0] ?? "").toLowerCase();
    return VERBS.filter((v) => v.id.startsWith(partial)).map((v) => ({
      token: v.id,
      display: v.id,
      trailing: v.label,
    }));
  }

  // Stage 2: slot autocomplete.
  const slot = parsed.verb.slots[parsed.active_slot];
  if (!slot) return [];

  const partial = parsed.tokens[parsed.active_slot + 1]?.toLowerCase() ?? "";
  const s = useFloor.getState();

  if (slot.kind === "unit") {
    const out: Suggestion[] = [];
    for (const u of s.units.values()) {
      if (slot.filter && !slot.filter(u)) continue;
      const csUpper = u.callsign.toUpperCase();
      if (
        partial.length === 0 ||
        u.callsign.toLowerCase().startsWith(partial) ||
        u.id.toLowerCase().startsWith(partial)
      ) {
        out.push({
          token: u.callsign,
          display: csUpper,
          trailing: `${u.id} · ${u.status.replace(/_/g, " ")}`,
        });
      }
    }
    return out;
  }

  if (slot.kind === "incident") {
    const out: Suggestion[] = [];
    for (const i of s.incidents.values()) {
      if (slot.filter && !slot.filter(i)) continue;
      if (
        partial.length === 0 ||
        i.id.toLowerCase().startsWith(partial) ||
        i.id.toLowerCase().includes(partial)
      ) {
        out.push({
          token: i.id,
          display: i.id,
          trailing: `${i.type.replace(/_/g, " ")} · ${i.severity}`,
        });
      }
    }
    return out;
  }

  if (slot.kind === "literal") {
    return slot.values
      .filter((v) => partial.length === 0 || v.toLowerCase().startsWith(partial))
      .map((v) => ({ token: v, display: v }));
  }

  if (slot.kind === "speed") {
    return SPEED_VALUES
      .filter((v) => partial.length === 0 || v.startsWith(partial))
      .map((v) => ({ token: v, display: `${v}×` }));
  }

  if (slot.kind === "kind") {
    const kinds: EntityKind[] = ["unit", "incident", "caller", "address", "personnel", "intel", "station", "vehicle"];
    return kinds
      .filter((k) => partial.length === 0 || k.startsWith(partial))
      .map((k) => ({ token: k, display: k }));
  }

  return [];
}

// ── Execute ────────────────────────────────────────────────────────────

export interface ExecuteResult {
  ok: boolean;
  text: string;
}

/**
 * Parse + run an input string. Validates that all required slots are present.
 */
export function executeInput(raw: string): ExecuteResult {
  const parsed = parseInput(raw.trim());
  if (parsed.tokens.length === 0) {
    return { ok: false, text: "empty command" };
  }
  if (!parsed.verb) {
    return { ok: false, text: `unknown verb ${parsed.tokens[0]}` };
  }
  const requiredArgs = parsed.verb.slots.length;
  const givenArgs = parsed.tokens.length - 1;
  if (givenArgs < requiredArgs) {
    const missing = parsed.verb.slots[givenArgs];
    return { ok: false, text: `missing ${missing.name} (slot ${givenArgs + 1}/${requiredArgs})` };
  }
  const args = parsed.tokens.slice(1, 1 + requiredArgs);
  const r = parsed.verb.run(args);
  return r.ok ? { ok: true, text: r.text } : { ok: false, text: r.reason };
}

/**
 * Apply a suggestion to the current input string. Used for Tab-complete.
 * Returns the new input value (with trailing space if there are more slots
 * remaining), and a flag indicating whether the verb is now fully resolved.
 */
export function applySuggestion(raw: string, suggestion: Suggestion): { value: string; complete: boolean } {
  const parsed = parseInput(raw);
  if (!parsed.verb || !parsed.verb_complete) {
    // Replacing/typing the verb itself.
    const value = `${suggestion.token} `;
    const v = VERBS.find((v) => v.id === suggestion.token);
    const complete = !!v && v.slots.length === 0;
    return { value, complete };
  }
  // Replacing the active slot's token.
  const head = parsed.tokens.slice(0, parsed.active_slot + 1).join(" ");
  const required = parsed.verb.slots.length;
  const filled = parsed.active_slot + 1; // including the one being added
  const trail = filled < required ? " " : "";
  return {
    value: `${head} ${suggestion.token}${trail}`,
    complete: filled >= required,
  };
}
