/**
 * Operator Sim — shift loader + runtime driver.
 *
 * Day 6: turns a YAML shift file (validated by `scripts/validate-shifts.mjs` in
 * CI) into the in-game spawn timeline + intel drop. Three responsibilities:
 *
 *   1. parseShift(yamlString) → Zod-validated `Shift`
 *   2. spawnDueIncidents() → on every tick, push ShiftIncidents whose
 *      `spawn_time_game_min` has been reached into the live `incidents` Map.
 *      Also drops shift intel into the intel feed at game_min 0.
 *   3. computeOutcome() → at end-of-shift, classify each incident as
 *      resolved-in-window / resolved-late / missed / cancelled and assign
 *      a letter grade (S / A / B / C / D).
 *
 * Address resolution: ShiftIncident.address is a human string ("1122 West
 * Central Park Avenue"). We trim, lowercase, and look up against the baked
 * address Map. CI's validator already prevents shipping a YAML with unknown
 * addresses, so a runtime miss is a programmer error and gets logged.
 */

import { parse as parseYaml } from "yaml";
import { Shift, type Shift as ShiftT, type ShiftIncident, type Incident, type Intel, type Address } from "@/lib/schemas";

export type IncidentOutcome =
  | "resolved_in_window"
  | "resolved_late"
  | "missed"
  | "cancelled";

export interface IncidentResult {
  shift_incident_id: string;
  type: ShiftIncident["type"];
  severity: ShiftIncident["severity"];
  outcome: IncidentOutcome;
  spawned_at_game_min: number;
  resolution_due_by_game_min: number;
  resolved_at_game_min?: number;
  late_by_game_min?: number;
}

export type ShiftGrade = "S" | "A" | "B" | "C" | "D";

export interface ShiftOutcome {
  shift_id: string;
  total: number;
  resolved_in_window: number;
  resolved_late: number;
  missed: number;
  cancelled: number;
  score: number; // 0..1
  grade: ShiftGrade;
  per_incident: IncidentResult[];
}

// ── parsing ─────────────────────────────────────────────────────────────

export function parseShift(yamlString: string): ShiftT {
  const raw = parseYaml(yamlString);
  return Shift.parse(raw);
}

export async function loadShift(url: string): Promise<ShiftT> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`shift fetch ${res.status} for ${url}`);
  const yamlText = await res.text();
  return parseShift(yamlText);
}

// ── spawn timeline driver ───────────────────────────────────────────────

/** Find the baked Address whose street matches the YAML's human string. */
function resolveAddress(human: string, addresses: Map<string, Address>): Address | null {
  const street = human.split(",")[0].trim().toLowerCase();
  for (const a of addresses.values()) {
    if (a.street.toLowerCase() === street) return a;
  }
  return null;
}

/**
 * Given the current `game_min`, push every ShiftIncident whose
 * `spawn_time_game_min` has been reached but isn't yet in the live `incidents`
 * Map (tracked via `already_spawned`). Returns the new live incidents +
 * narrative events to log. Pure: caller commits to the store.
 */
export function spawnDueIncidents(
  shift: ShiftT,
  game_min: number,
  already_spawned: Set<string>,
  addresses: Map<string, Address>,
): { incidents: Incident[]; events: string[]; spawned_ids: string[] } {
  const incidents: Incident[] = [];
  const events: string[] = [];
  const spawned_ids: string[] = [];

  for (const si of shift.incidents) {
    if (already_spawned.has(si.id)) continue;
    if (si.spawn_time_game_min > game_min) continue;

    const addr = resolveAddress(si.address, addresses);
    if (!addr) {
      events.push(`spawn FAIL · ${si.id} address "${si.address}" not in baked set`);
      // mark as spawned anyway so we don't retry every tick
      spawned_ids.push(si.id);
      continue;
    }

    const incident: Incident = {
      id: si.id,
      type: si.type,
      severity: si.severity,
      status: "queued",
      address_id: addr.id,
      reported_at_game_min: si.spawn_time_game_min,
      resolution_window_game_min: si.resolution_window_game_min,
      dispatched_unit_ids: [],
      narrative_thread_id: si.thread_id,
      shift_id: shift.id,
      required_unit_classes: si.required_units,
    };
    incidents.push(incident);
    spawned_ids.push(si.id);
    events.push(`incoming · ${si.id} ${si.type} @ ${addr.street} (sev ${si.severity})`);
  }

  return { incidents, events, spawned_ids };
}

/** Build Intel records from shift.intel — emitted at shift start. */
export function buildShiftIntel(shift: ShiftT): Intel[] {
  return shift.intel.map((it) => ({
    id: it.id,
    type: it.type,
    severity: it.severity,
    body: it.body,
    posted_at_game_min: 0,
    expires_at_game_min: shift.length_game_min,
    linked_entity_ids: [],
  }));
}

/**
 * Day 11: which narrative arcs are currently in flight.
 *
 * An arc is "active" iff at least one of its `incident_ids` is currently
 * live in the incidents Map AND its status is not resolved/cancelled. Used
 * by ShiftHUD to surface the storyline the player is in the middle of
 * without bloating the right rail.
 */
export interface ActiveArc {
  id: string;
  arc: string;
}

export function activeNarrativeArcs(
  shift: ShiftT,
  liveIncidents: Map<string, Incident>,
): ActiveArc[] {
  const out: ActiveArc[] = [];
  for (const thread of shift.narrative_threads) {
    let any_live = false;
    for (const iid of thread.incident_ids) {
      const inc = liveIncidents.get(iid);
      if (inc && inc.status !== "resolved" && inc.status !== "cancelled") {
        any_live = true;
        break;
      }
    }
    if (any_live) out.push({ id: thread.id, arc: thread.arc });
  }
  return out;
}

// ── outcome scoring ─────────────────────────────────────────────────────

function classify(si: ShiftIncident, live: Incident | undefined): IncidentResult {
  const due_by = si.spawn_time_game_min + si.resolution_window_game_min;
  const base = {
    shift_incident_id: si.id,
    type: si.type,
    severity: si.severity,
    spawned_at_game_min: si.spawn_time_game_min,
    resolution_due_by_game_min: due_by,
  };

  if (!live) {
    return { ...base, outcome: "missed" };
  }
  if (live.status === "cancelled") {
    return { ...base, outcome: "cancelled" };
  }
  if (live.status === "resolved" && live.resolved_at_game_min !== undefined) {
    const resolved_at = live.resolved_at_game_min;
    const late_by = resolved_at - due_by;
    if (late_by <= 0) {
      return { ...base, outcome: "resolved_in_window", resolved_at_game_min: resolved_at };
    }
    return {
      ...base,
      outcome: "resolved_late",
      resolved_at_game_min: resolved_at,
      late_by_game_min: late_by,
    };
  }
  // queued / dispatched / on_scene at shift end → missed
  return { ...base, outcome: "missed" };
}

function gradeFromScore(score: number): ShiftGrade {
  if (score >= 0.95) return "S";
  if (score >= 0.85) return "A";
  if (score >= 0.7) return "B";
  if (score >= 0.5) return "C";
  return "D";
}

/**
 * Score a finished shift. `score` is a weighted sum: in-window = 1.0,
 * resolved-late = 0.5, missed/cancelled = 0.0. Letter grade thresholds:
 *   S ≥ 0.95   A ≥ 0.85   B ≥ 0.70   C ≥ 0.50   D < 0.50
 */
export function computeOutcome(
  shift: ShiftT,
  liveIncidents: Map<string, Incident>,
): ShiftOutcome {
  const per_incident = shift.incidents.map((si) => classify(si, liveIncidents.get(si.id)));
  const counts = {
    resolved_in_window: 0,
    resolved_late: 0,
    missed: 0,
    cancelled: 0,
  };
  let weighted = 0;
  for (const r of per_incident) {
    counts[r.outcome] += 1;
    if (r.outcome === "resolved_in_window") weighted += 1;
    else if (r.outcome === "resolved_late") weighted += 0.5;
  }
  const total = per_incident.length;
  const score = total === 0 ? 0 : weighted / total;
  return {
    shift_id: shift.id,
    total,
    ...counts,
    score,
    grade: gradeFromScore(score),
    per_incident,
  };
}
