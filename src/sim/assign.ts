/**
 * Operator Sim — Day 10 closest-unit auto-assignment.
 *
 * `assign <incident>` resolves the right number of units (per
 * `incident.required_unit_classes`) and dispatches the *closest available
 * unit of each required class*. Falls back to "any one closest available
 * unit" when the incident has no class requirement (legacy single-unit).
 *
 * Picker math: crow-flight haversine from each unit's current_position to
 * the incident address coord. Cheap, agency-blind, deterministic. Phase 3+
 * can swap in road-graph distance.
 */

import { useFloor } from "@/state/useFloor";
import type { Incident, IncidentType, Unit, VehicleClass } from "@/lib/schemas";
import { dispatch } from "./dispatch";
import { haversineMeters } from "./roadGraph";

// ── Day 13 — agency filtering ────────────────────────────────────────────
//
// Map every incident type to the set of vehicle classes that are
// *appropriate* to respond. This is the dispatcher's first sanity check:
// a `police_burglary` should never auto-pick a fire engine, even if the
// engine is closest. The mapping is broad on purpose — overlap (e.g.
// `rescue` covers both fire-rescue and EMS-rescue) is fine, the goal is
// to filter out absurd picks rather than enforce strict agency policy.
//
// Multi-unit incidents already get this for free via
// `required_unit_classes`. The filtering matters most for single-unit
// (legacy) incidents and as a guard rail when a shift YAML omits the
// requirement.

const COMPATIBILITY: Record<IncidentType, readonly VehicleClass[]> = {
  // Fire — engine first, ladder for high-rise/aerial work, tanker on
  // brush, rescue + command on incidents that escalate.
  fire_residential:     ["engine", "ladder", "rescue", "command"],
  fire_commercial:      ["engine", "ladder", "rescue", "command"],
  fire_vehicle:         ["engine", "rescue", "command"],
  fire_brush:           ["brush", "tanker", "engine", "command"],

  // Medical — ALS by default; BLS for non-life-threat; supervisor on
  // any incident that needs an EMS lieutenant on scene.
  medical_cardiac:      ["ambulance_als", "supervisor"],
  medical_trauma:       ["ambulance_als", "supervisor", "rescue"],
  medical_general:      ["ambulance_als", "ambulance_bls", "supervisor"],

  // Rescue — fire-rescue (MVA, water) wants the engine + ALS bus
  // together. Marine for water rescue. Air covers air-mobile work.
  rescue_motor_vehicle: ["engine", "rescue", "ambulance_als", "ladder"],
  rescue_water:         ["marine", "rescue", "engine", "ambulance_als", "air"],

  // Hazmat — engine + command. (We don't ship a `hazmat` VehicleClass
  // yet; the engine carries the suit.)
  hazmat_spill:         ["engine", "command"],

  // Alarms / service calls — light response.
  alarm_false:          ["engine"],
  service_call:         ["patrol", "engine", "supervisor"],

  // Police.
  police_disturbance:   ["patrol", "k9", "supervisor"],
  police_traffic:       ["patrol", "supervisor"],
  police_burglary:      ["patrol", "k9", "supervisor"],
  police_assault:       ["patrol", "k9", "swat_armored", "supervisor"],
};

export function compatibleClassesFor(incidentType: IncidentType): readonly VehicleClass[] {
  return COMPATIBILITY[incidentType] ?? [];
}

export function isClassCompatible(incidentType: IncidentType, vehicleClass: VehicleClass): boolean {
  return COMPATIBILITY[incidentType]?.includes(vehicleClass) ?? false;
}

export type AssignResult =
  | { ok: true; assigned: Array<{ unit_id: string; class: VehicleClass | "any"; route_m: number }>; text: string }
  | { ok: false; reason: string };

function classOf(unit: Unit, vehicles: Map<string, { class: VehicleClass }>): VehicleClass | undefined {
  return vehicles.get(unit.vehicle_id)?.class;
}

/**
 * Pick the closest available unit of the given class.
 *
 *   - `klass` non-null → only that class qualifies. Compatibility set is
 *     ignored (the caller already chose the class).
 *   - `klass` null + `compatibleClasses` non-empty → any unit whose class
 *     is in the set qualifies (Day 13 agency-filter path).
 *   - `klass` null + `compatibleClasses` empty/null → any class qualifies
 *     (legacy any-unit path; preserved for tests + back-compat).
 *
 * `excluded` is a set of unit ids already picked in this assign call.
 */
export function pickClosestAvailable(
  incidentCoord: [number, number],
  klass: VehicleClass | null,
  units: Map<string, Unit>,
  vehicles: Map<string, { class: VehicleClass }>,
  excluded: Set<string>,
  compatibleClasses?: readonly VehicleClass[] | null,
): Unit | null {
  const compatSet = compatibleClasses && compatibleClasses.length > 0
    ? new Set<VehicleClass>(compatibleClasses)
    : null;
  let best: Unit | null = null;
  let bestDist = Infinity;
  for (const u of units.values()) {
    if (excluded.has(u.id)) continue;
    if (u.status !== "available") continue;
    const c = classOf(u, vehicles);
    if (klass !== null) {
      if (c !== klass) continue;
    } else if (compatSet) {
      if (!c || !compatSet.has(c)) continue;
    }
    const d = haversineMeters(u.current_position, incidentCoord);
    if (d < bestDist) {
      bestDist = d;
      best = u;
    }
  }
  return best;
}

/**
 * Auto-assign all required units to an incident, picking each one closest
 * to scene by haversine. Calls dispatch() for each pick, so the same FSM
 * + road-graph routing kicks in as for manual dispatch. Returns the per-
 * class picks, or fails fast on the first unfillable class.
 */
export function assignClosest(incidentArg: string): AssignResult {
  const s = useFloor.getState();

  // Resolve the incident.
  let incident: Incident | null = null;
  if (s.incidents.has(incidentArg)) incident = s.incidents.get(incidentArg)!;
  else {
    for (const i of s.incidents.values()) {
      if (i.id === incidentArg) { incident = i; break; }
    }
  }
  if (!incident) return { ok: false, reason: `unknown incident ${incidentArg}` };
  if (incident.status === "resolved" || incident.status === "cancelled") {
    return { ok: false, reason: `incident ${incident.id} already ${incident.status}` };
  }

  const addr = s.addresses.get(incident.address_id);
  if (!addr) return { ok: false, reason: `incident has no resolvable address` };
  const coord = addr.coord;

  const required = incident.required_unit_classes ?? [];
  const excluded = new Set<string>(incident.dispatched_unit_ids);
  const picks: Array<{ unit_id: string; class: VehicleClass | "any"; route_m: number }> = [];

  // Skip classes already covered by previously-dispatched units.
  const alreadyOnIncident = new Set<VehicleClass>();
  for (const uid of incident.dispatched_unit_ids) {
    const u = s.units.get(uid);
    if (!u) continue;
    const c = classOf(u, s.vehicles);
    if (c) alreadyOnIncident.add(c);
  }

  if (required.length === 0) {
    // Single-unit incident: pick the closest available unit whose class
    // is compatible with this incident type. Day 13: a `police_burglary`
    // can no longer pull a fire engine; a `medical_cardiac` only
    // considers ambulances + supervisor.
    if (incident.dispatched_unit_ids.length > 0) {
      return { ok: false, reason: `${incident.id} already has units assigned` };
    }
    const compat = compatibleClassesFor(incident.type);
    const pick = pickClosestAvailable(coord, null, s.units, s.vehicles, excluded, compat);
    if (!pick) {
      const compatLabel = compat.length === 0 ? "any class" : compat.join("/");
      return { ok: false, reason: `no available ${compatLabel} unit for ${incident.type}` };
    }
    const r = dispatch(pick.id, incident.id);
    if (!r.ok) return { ok: false, reason: r.reason };
    const cls = s.vehicles.get(pick.vehicle_id)?.class ?? "any";
    picks.push({ unit_id: pick.id, class: cls, route_m: r.route_m });
  } else {
    // Multi-unit: cover each required class with its own closest available unit.
    // The shift YAML is the source of truth here — if it asked for a class,
    // we trust it (the validator already checked compat). The class match in
    // pickClosestAvailable enforces correctness; agency filtering is moot.
    for (const klass of required) {
      if (alreadyOnIncident.has(klass)) continue;
      const pick = pickClosestAvailable(coord, klass, s.units, s.vehicles, excluded);
      if (!pick) {
        return {
          ok: false,
          reason: `no available ${klass} unit for ${incident.id} (filled ${picks.length}/${required.length})`,
        };
      }
      const r = dispatch(pick.id, incident.id);
      if (!r.ok) return { ok: false, reason: r.reason };
      excluded.add(pick.id);
      picks.push({ unit_id: pick.id, class: klass, route_m: r.route_m });
    }
  }

  if (picks.length === 0) {
    return { ok: false, reason: `${incident.id} requirement already satisfied` };
  }

  const summary = picks
    .map((p) => `${s.units.get(p.unit_id)?.callsign ?? p.unit_id}(${p.class})`)
    .join(" + ");
  return {
    ok: true,
    assigned: picks,
    text: `assigned ${summary} → ${incident.id}`,
  };
}
