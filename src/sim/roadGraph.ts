/**
 * Operator Sim — road graph built from baked OSM `roads.geojson`.
 *
 * Each LineString is decomposed into segments. Endpoints are quantised to 6
 * decimals (~11 cm) so OSM's shared way endpoints collapse into single nodes.
 * Adjacency is stored undirected with edge length in meters via haversine.
 *
 * v0.1: brute-force nearest-node lookup. Phase 2 swaps to a KD-tree if needed.
 */

import type { Coord } from "@/lib/schemas";

const COORD_PRECISION = 6;
const DEG_TO_RAD = Math.PI / 180;
const EARTH_R_M = 6_371_008.8; // GRS80 mean radius

export interface AdjEntry {
  to: string;
  dist_m: number;
}

export interface RoadGraph {
  nodes: Map<string, Coord>; // id -> [lng, lat]
  adjacency: Map<string, AdjEntry[]>;
}

interface RoadFeature {
  type: "Feature";
  properties: Record<string, unknown> | null;
  geometry: { type: "LineString"; coordinates: number[][] };
}

interface RoadsCollection {
  type: "FeatureCollection";
  features: RoadFeature[];
}

function nodeId(coord: Coord): string {
  return `${coord[0].toFixed(COORD_PRECISION)},${coord[1].toFixed(COORD_PRECISION)}`;
}

export function haversineMeters(a: Coord, b: Coord): number {
  const lat1 = a[1] * DEG_TO_RAD;
  const lat2 = b[1] * DEG_TO_RAD;
  const dlat = (b[1] - a[1]) * DEG_TO_RAD;
  const dlng = (b[0] - a[0]) * DEG_TO_RAD;
  const s =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function buildRoadGraph(geo: RoadsCollection): RoadGraph {
  const nodes = new Map<string, Coord>();
  const adjacency = new Map<string, AdjEntry[]>();

  for (const f of geo.features) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    let prevId: string | null = null;
    let prevCoord: Coord | null = null;
    for (const c of coords) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const co: Coord = [c[0], c[1]];
      const id = nodeId(co);
      if (!nodes.has(id)) nodes.set(id, co);
      if (!adjacency.has(id)) adjacency.set(id, []);
      if (prevId && prevCoord && prevId !== id) {
        const d = haversineMeters(prevCoord, co);
        adjacency.get(prevId)!.push({ to: id, dist_m: d });
        adjacency.get(id)!.push({ to: prevId, dist_m: d });
      }
      prevId = id;
      prevCoord = co;
    }
  }

  return { nodes, adjacency };
}

export async function loadRoadGraph(url: string): Promise<RoadGraph | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[roadGraph] fetch ${res.status} ${url}`);
      return null;
    }
    const geo: RoadsCollection = await res.json();
    return buildRoadGraph(geo);
  } catch (err) {
    console.warn("[roadGraph] load failed", err);
    return null;
  }
}

export function nearestNode(graph: RoadGraph, coord: Coord): string | null {
  let best: string | null = null;
  let bestSq = Infinity;
  // Squared planar distance is fine for nearest-of search at small extents.
  for (const [id, c] of graph.nodes) {
    const dx = c[0] - coord[0];
    const dy = c[1] - coord[1];
    const sq = dx * dx + dy * dy;
    if (sq < bestSq) {
      bestSq = sq;
      best = id;
    }
  }
  return best;
}
