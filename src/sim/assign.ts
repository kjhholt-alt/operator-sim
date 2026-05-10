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
import type { Incident, Unit, VehicleClass } from "@/lib/schemas";
import { dispatch } from "./dispatch";
import { haversineMeters } from "./roadGraph";

export type AssignResult =
  | { ok: true; assigned: Array<{ unit_id: string; class: VehicleClass | "any"; route_m: number }>; text: string }
  | { ok: false; reason: string };

function classOf(unit: Unit, vehicles: Map<string, { class: VehicleClass }>): VehicleClass | undefined {
  return vehicles.get(unit.vehicle_id)?.class;
}

/**
 * Pick the closest available unit of the given class. If `klass` is null,
 * any class qualifies. `excluded` is a set of unit ids already picked in
 * this multi-class assign call (so the same unit isn't double-counted).
 */
export function pickClosestAvailable(
  incidentCoord: [number, number],
  klass: VehicleClass | null,
  units: Map<string, Unit>,
  vehicles: Map<string, { class: VehicleClass }>,
  excluded: Set<string>,
): Unit | null {
  let best: Unit | null = null;
  let bestDist = Infinity;
  for (const u of units.values()) {
    if (excluded.has(u.id)) continue;
    if (u.status !== "available") continue;
    if (klass !== null && classOf(u, vehicles) !== klass) continue;
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
    // Single-unit incident: pick any one closest available unit.
    if (incident.dispatched_unit_ids.length > 0) {
      return { ok: false, reason: `${incident.id} already has units assigned` };
    }
    const pick = pickClosestAvailable(coord, null, s.units, s.vehicles, excluded);
    if (!pick) return { ok: false, reason: "no available units" };
    const r = dispatch(pick.id, incident.id);
    if (!r.ok) return { ok: false, reason: r.reason };
    picks.push({ unit_id: pick.id, class: "any", route_m: r.route_m });
  } else {
    // Multi-unit: cover each required class with its own closest available unit.
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
