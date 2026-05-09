/**
 * Operator Sim — dispatch FSM.
 *
 * The first thing the game does. A unit-incident pair becomes:
 *   1. dispatch()        → unit en_route on a real road-graph route
 *   2. tickStep() loop   → unit walks the polyline at UNIT_SPEED
 *   3. arrive on_scene   → engages incident for resolution_window minutes
 *   4. resolve + return  → unit routes home, becomes available
 *
 * State changes are produced as a single setState() per tick — units and
 * incidents are recreated as new Maps so React re-renders deterministically.
 */

import { useFloor } from "@/state/useFloor";
import type { Unit, Incident, Coord } from "@/lib/schemas";
import { shortestPath, walkAlong } from "./pathfinding";
import type { RoadGraph } from "./roadGraph";

// 30 mph average ~= 800 m / game-min. Phase 2 splits by VehicleClass + road tier.
export const UNIT_SPEED_M_PER_GAME_MIN = 800;

export type DispatchResult =
  | { ok: true; unit_id: string; incident_id: string; route_m: number }
  | { ok: false; reason: string };

function resolveIncidentArg(
  arg: string,
  incidents: Map<string, Incident>,
): Incident | null {
  if (incidents.has(arg)) return incidents.get(arg)!;
  // allow trailing-digit matches: "4" → i_2031 if trailing
  const trimmed = arg.replace(/^i_/, "");
  for (const i of incidents.values()) {
    if (i.id === trimmed) return i;
    if (i.id.endsWith(`_${trimmed}`) || i.id.endsWith(trimmed)) return i;
  }
  return null;
}

function resolveUnitArg(
  arg: string,
  units: Map<string, Unit>,
): Unit | null {
  if (units.has(arg)) return units.get(arg)!;
  const upper = arg.toUpperCase();
  for (const u of units.values()) {
    if (u.callsign.toUpperCase() === upper) return u;
  }
  return null;
}

/**
 * Public dispatch entrypoint. Accepts callsign or id for the unit, and
 * incident id (with or without "i_" prefix) or trailing digits.
 */
export function dispatch(unitArg: string, incidentArg: string): DispatchResult {
  const s = useFloor.getState();
  if (!s.road_graph) {
    return { ok: false, reason: "road graph not loaded yet" };
  }
  const unit = resolveUnitArg(unitArg, s.units);
  if (!unit) return { ok: false, reason: `unknown unit ${unitArg}` };
  if (unit.status !== "available") {
    return { ok: false, reason: `unit ${unit.callsign} not available (${unit.status})` };
  }
  const incident = resolveIncidentArg(incidentArg, s.incidents);
  if (!incident) return { ok: false, reason: `unknown incident ${incidentArg}` };
  if (incident.status === "resolved" || incident.status === "cancelled") {
    return { ok: false, reason: `incident ${incident.id} already ${incident.status}` };
  }
  const addr = s.addresses.get(incident.address_id);
  if (!addr) {
    return { ok: false, reason: `incident has no resolvable address (${incident.address_id})` };
  }

  const route = shortestPath(s.road_graph, unit.current_position, addr.coord);
  if (!route) return { ok: false, reason: "no route on road graph" };

  const updatedUnit: Unit = {
    ...unit,
    status: "en_route",
    status_since_game_min: s.game_min,
    current_route: route.coords,
    route_progress_m: 0,
    route_total_m: route.length_m,
    destination_coord: addr.coord,
    on_arrival: "on_scene",
    current_incident_id: incident.id,
  };

  const dispatched = new Set([...incident.dispatched_unit_ids, unit.id]);
  const updatedIncident: Incident = {
    ...incident,
    status: "dispatched",
    dispatched_unit_ids: Array.from(dispatched),
  };

  const nextUnits = new Map(s.units);
  nextUnits.set(unit.id, updatedUnit);
  const nextIncidents = new Map(s.incidents);
  nextIncidents.set(incident.id, updatedIncident);

  useFloor.setState({ units: nextUnits, incidents: nextIncidents });
  s.logEvent(
    `dispatch · ${unit.callsign} → ${incident.id} (${addr.street}, ${(route.length_m / 1000).toFixed(2)} km)`,
  );

  return { ok: true, unit_id: unit.id, incident_id: incident.id, route_m: route.length_m };
}

/** Send a unit home from wherever it is. Sets status=returning. */
export function sendHome(unitId: string): DispatchResult {
  const s = useFloor.getState();
  if (!s.road_graph) return { ok: false, reason: "road graph not loaded yet" };
  const unit = s.units.get(unitId);
  if (!unit) return { ok: false, reason: `unknown unit ${unitId}` };

  const station = s.stations.get(unit.homebase_station_id);
  const homeAddr = station ? s.addresses.get(station.address_id) : undefined;
  // Fall back to current position if homebase coord is unknown — keeps the unit
  // in a coherent terminal state instead of stranded en_route.
  const homeCoord: Coord = homeAddr?.coord ?? unit.current_position;

  const route = shortestPath(s.road_graph, unit.current_position, homeCoord);
  if (!route) {
    // No path — just declare the unit available where it stands.
    const fallback: Unit = {
      ...unit,
      status: "available",
      status_since_game_min: s.game_min,
      current_route: undefined,
      route_progress_m: undefined,
      route_total_m: undefined,
      destination_coord: undefined,
      on_arrival: undefined,
      current_incident_id: undefined,
    };
    const next = new Map(s.units);
    next.set(unit.id, fallback);
    useFloor.setState({ units: next });
    return { ok: false, reason: "no route home — set available in place" };
  }

  const updated: Unit = {
    ...unit,
    status: "returning",
    status_since_game_min: s.game_min,
    current_route: route.coords,
    route_progress_m: 0,
    route_total_m: route.length_m,
    destination_coord: homeCoord,
    on_arrival: "available",
    current_incident_id: undefined,
  };
  const next = new Map(s.units);
  next.set(unit.id, updated);
  useFloor.setState({ units: next });
  s.logEvent(`return · ${unit.callsign} → ${station?.name ?? "homebase"}`);
  return { ok: true, unit_id: unit.id, incident_id: "", route_m: route.length_m };
}

interface FsmContext {
  game_min: number;
  units: Map<string, Unit>;
  incidents: Map<string, Incident>;
  road_graph: RoadGraph | null;
  addresses: ReturnType<typeof useFloor.getState>["addresses"];
  stations: ReturnType<typeof useFloor.getState>["stations"];
  events: string[];
}

/**
 * Pure-ish FSM step. Mutates the Maps in `ctx` in place and pushes any
 * narrative events into ctx.events. Caller commits to the store.
 *
 * Three transitions handled:
 *   - en_route + arrived → on_scene (engages incident)
 *   - on_scene + dwell complete → resolved + returning
 *   - returning + arrived → available
 *
 * Position interpolation along route happens BEFORE arrival check so a unit
 * that finishes its route this frame ends at the destination coord, not 0.99.
 */
export function tickStep(delta_game_min: number, ctx: FsmContext): void {
  if (delta_game_min <= 0) return;
  const delta_m = delta_game_min * UNIT_SPEED_M_PER_GAME_MIN;

  // ── Phase 1: advance progress on en_route / returning ────────────────
  for (const [id, unit] of ctx.units) {
    if (
      (unit.status === "en_route" || unit.status === "returning") &&
      unit.current_route &&
      unit.route_total_m !== undefined &&
      unit.route_progress_m !== undefined
    ) {
      const next_progress = unit.route_progress_m + delta_m;
      const arrived = next_progress >= unit.route_total_m;
      const finalCoord = arrived
        ? unit.destination_coord ?? unit.current_route[unit.current_route.length - 1]
        : walkAlong(unit.current_route, next_progress);
      ctx.units.set(id, {
        ...unit,
        current_position: finalCoord,
        route_progress_m: arrived ? unit.route_total_m : next_progress,
      });
    }
  }

  // ── Phase 2: arrival transitions ─────────────────────────────────────
  for (const [id, unit] of ctx.units) {
    if (
      (unit.status === "en_route" || unit.status === "returning") &&
      unit.route_total_m !== undefined &&
      unit.route_progress_m !== undefined &&
      unit.route_progress_m >= unit.route_total_m
    ) {
      const arrival = unit.on_arrival ?? (unit.status === "en_route" ? "on_scene" : "available");
      const cleared: Unit = {
        ...unit,
        status: arrival,
        status_since_game_min: ctx.game_min,
        current_route: undefined,
        route_progress_m: undefined,
        route_total_m: undefined,
        on_arrival: undefined,
        // Returning to available drops incident link; arriving on_scene keeps it.
        current_incident_id: arrival === "available" ? undefined : unit.current_incident_id,
      };
      ctx.units.set(id, cleared);

      if (arrival === "on_scene" && unit.current_incident_id) {
        const inc = ctx.incidents.get(unit.current_incident_id);
        if (inc && inc.status !== "resolved") {
          ctx.incidents.set(inc.id, { ...inc, status: "on_scene" });
          ctx.events.push(`on_scene · ${unit.callsign} @ ${inc.id}`);
        }
      } else if (arrival === "available") {
        ctx.events.push(`available · ${unit.callsign} returned`);
      }
    }
  }

  // ── Phase 3: on-scene resolution + auto-return ───────────────────────
  for (const [id, unit] of ctx.units) {
    if (unit.status !== "on_scene" || !unit.current_incident_id) continue;
    const inc = ctx.incidents.get(unit.current_incident_id);
    if (!inc) continue;
    const dwell = ctx.game_min - unit.status_since_game_min;
    if (dwell < inc.resolution_window_game_min) continue;

    // Mark incident resolved (idempotent).
    if (inc.status !== "resolved") {
      ctx.incidents.set(inc.id, {
        ...inc,
        status: "resolved",
        resolved_at_game_min: ctx.game_min,
      });
      ctx.events.push(`resolved · ${inc.id} (${unit.callsign})`);
    }

    // Send unit home.
    if (!ctx.road_graph) {
      // No graph → declare available in place. Shouldn't happen in practice.
      ctx.units.set(id, {
        ...unit,
        status: "available",
        status_since_game_min: ctx.game_min,
        current_incident_id: undefined,
      });
      continue;
    }
    const station = ctx.stations.get(unit.homebase_station_id);
    const homeAddr = station ? ctx.addresses.get(station.address_id) : undefined;
    const homeCoord: Coord = homeAddr?.coord ?? unit.current_position;
    const route = shortestPath(ctx.road_graph, unit.current_position, homeCoord);

    if (!route) {
      ctx.units.set(id, {
        ...unit,
        status: "available",
        status_since_game_min: ctx.game_min,
        current_incident_id: undefined,
      });
      continue;
    }

    ctx.units.set(id, {
      ...unit,
      status: "returning",
      status_since_game_min: ctx.game_min,
      current_route: route.coords,
      route_progress_m: 0,
      route_total_m: route.length_m,
      destination_coord: homeCoord,
      on_arrival: "available",
      current_incident_id: undefined,
    });
  }
}
