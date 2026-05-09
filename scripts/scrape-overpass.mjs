#!/usr/bin/env node
/*
 * Operator Sim — Overpass API scraper.
 *
 * Bakes Quad Cities OSM data to public/data/qc-{roads,buildings,addresses}.{geojson,json}.
 * Run once per city. Output committed to repo (small enough). Re-run only when adding cities.
 *
 * Usage:
 *   node scripts/scrape-overpass.mjs [--city <slug>] [--bbox <lng_min,lat_min,lng_max,lat_max>]
 *
 * Default: quad_cities, bbox -90.7,41.4,-90.4,41.7
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const city = arg("city", "quad_cities");
const bboxStr = arg("bbox", "-90.7,41.4,-90.4,41.7");
const [west, south, east, north] = bboxStr.split(",").map(Number);

if ([west, south, east, north].some(Number.isNaN)) {
  console.error("Invalid --bbox. Format: lng_min,lat_min,lng_max,lat_max");
  process.exit(1);
}

const outDir = resolve(repoRoot, "public", "data", city);
mkdirSync(outDir, { recursive: true });

const ENDPOINT = "https://overpass-api.de/api/interpreter";

// Overpass QL — three queries, batched as separate calls to stay under timeout.

const Q_ROADS = `
[out:json][timeout:180];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street)$"](${south},${west},${north},${east});
);
out tags geom;
`;

const Q_BUILDINGS = `
[out:json][timeout:180];
(
  way["building"](${south},${west},${north},${east});
);
out tags geom;
`;

const Q_ADDRESSES = `
[out:json][timeout:180];
(
  node["addr:housenumber"]["addr:street"](${south},${west},${north},${east});
);
out tags;
`;

async function fetchOverpass(query, label) {
  console.log(`[overpass] querying ${label}…`);
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass ${label} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const ms = Date.now() - t0;
  console.log(`[overpass] ${label} → ${json.elements?.length ?? 0} elements in ${ms}ms`);
  return json;
}

function waysToGeoJSON(elements, kind) {
  const features = [];
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { id: `${kind}/${el.id}`, ...(el.tags ?? {}) },
      geometry: {
        type: "LineString",
        coordinates: el.geometry.map((p) => [p.lon, p.lat]),
      },
    });
  }
  return { type: "FeatureCollection", features };
}

function buildingsToGeoJSON(elements) {
  const features = [];
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 3) continue;
    features.push({
      type: "Feature",
      properties: { id: `building/${el.id}`, ...(el.tags ?? {}) },
      geometry: {
        type: "Polygon",
        coordinates: [el.geometry.map((p) => [p.lon, p.lat])],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

function nodesToAddressList(elements) {
  return elements
    .filter((el) => el.tags?.["addr:housenumber"] && el.tags?.["addr:street"])
    .map((el) => ({
      id: `addr/${el.id}`,
      street: `${el.tags["addr:housenumber"]} ${el.tags["addr:street"]}`,
      city: el.tags["addr:city"] ?? null,
      state: el.tags["addr:state"] ?? null,
      postal: el.tags["addr:postcode"] ?? null,
      coord: [el.lon, el.lat],
    }));
}

async function main() {
  console.log(`[scrape] city=${city} bbox=[${west},${south},${east},${north}]`);
  console.log(`[scrape] output: ${outDir}`);

  const [roads, buildings, addresses] = await Promise.all([
    fetchOverpass(Q_ROADS, "roads"),
    fetchOverpass(Q_BUILDINGS, "buildings"),
    fetchOverpass(Q_ADDRESSES, "addresses"),
  ]);

  const roadsGeo = waysToGeoJSON(roads.elements ?? [], "way");
  const buildingsGeo = buildingsToGeoJSON(buildings.elements ?? []);
  const addressList = nodesToAddressList(addresses.elements ?? []);

  writeFileSync(resolve(outDir, "roads.geojson"), JSON.stringify(roadsGeo));
  writeFileSync(resolve(outDir, "buildings.geojson"), JSON.stringify(buildingsGeo));
  writeFileSync(resolve(outDir, "addresses.json"), JSON.stringify(addressList));

  // Compact stats
  console.log("");
  console.log(`✓ roads:     ${roadsGeo.features.length} features`);
  console.log(`✓ buildings: ${buildingsGeo.features.length} features`);
  console.log(`✓ addresses: ${addressList.length} entries`);
  console.log("");
  console.log(`done. files in ${outDir}`);
}

main().catch((err) => {
  console.error("[scrape] FAILED:", err.message);
  process.exit(1);
});
