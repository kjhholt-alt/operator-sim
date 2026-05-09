/**
 * Dijkstra shortest-path on the baked road graph.
 *
 * v0.1: undirected, edge weight = meters. No oneway / turn penalties / speed
 * tiers — those are Phase 2 polish. Lazy decrease-key via duplicate entries
 * filtered with a visited set on pop.
 */

import { MinHeap } from "./minHeap";
import { nearestNode, type RoadGraph } from "./roadGraph";
import type { Coord } from "@/lib/schemas";

export interface Route {
  coords: Coord[]; // ordered polyline from start to goal (>= 2 points)
  length_m: number;
}

export function shortestPath(
  graph: RoadGraph,
  from: Coord,
  to: Coord,
): Route | null {
  if (graph.nodes.size === 0) return null;
  const startId = nearestNode(graph, from);
  const goalId = nearestNode(graph, to);
  if (!startId || !goalId) return null;

  if (startId === goalId) {
    const c = graph.nodes.get(startId)!;
    return { coords: [c, c], length_m: 0 };
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap<string>();

  dist.set(startId, 0);
  heap.push(0, startId);

  while (heap.size > 0) {
    const u = heap.pop()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === goalId) break;

    const du = dist.get(u)!;
    const adj = graph.adjacency.get(u);
    if (!adj) continue;
    for (const { to: v, dist_m } of adj) {
      if (visited.has(v)) continue;
      const nd = du + dist_m;
      const cur = dist.get(v);
      if (cur === undefined || nd < cur) {
        dist.set(v, nd);
        prev.set(v, u);
        heap.push(nd, v);
      }
    }
  }

  if (!dist.has(goalId)) return null;

  const ids: string[] = [goalId];
  let cur = goalId;
  while (prev.has(cur)) {
    cur = prev.get(cur)!;
    ids.unshift(cur);
  }

  const coords = ids.map((id) => graph.nodes.get(id)!);
  return { coords, length_m: dist.get(goalId)! };
}

/**
 * Walk a polyline by `dist_m` meters from its head, returning the coord at
 * that point. Used to interpolate unit position along its current_route.
 *
 * If `dist_m` exceeds the polyline length, returns the last vertex.
 */
export function walkAlong(coords: Coord[], dist_m: number): Coord {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];
  if (dist_m <= 0) return coords[0];

  let remaining = dist_m;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const segLen = segmentLengthM(a, b);
    if (remaining <= segLen || i === coords.length - 2) {
      const t = segLen === 0 ? 0 : Math.min(1, remaining / segLen);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    remaining -= segLen;
  }
  return coords[coords.length - 1];
}

function segmentLengthM(a: Coord, b: Coord): number {
  // Local equirectangular approximation — accurate for tens of km within QC.
  const DEG_TO_RAD = Math.PI / 180;
  const meanLat = ((a[1] + b[1]) / 2) * DEG_TO_RAD;
  const dx = (b[0] - a[0]) * DEG_TO_RAD * Math.cos(meanLat);
  const dy = (b[1] - a[1]) * DEG_TO_RAD;
  return Math.sqrt(dx * dx + dy * dy) * 6_371_008.8;
}

export function polylineLengthM(coords: Coord[]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += segmentLengthM(coords[i], coords[i + 1]);
  }
  return total;
}
