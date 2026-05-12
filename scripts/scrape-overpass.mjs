#!/usr/bin/env node
/*
 * Operator Sim — Overpass API scraper.
 *
 * Bakes city OSM data to public/data/<city>/{roads,buildings,addresses}.{geojson,json}.
 * Run once per city, output committed to repo. Re-run when expanding the
 * bbox or adding cities.
 *
 * Usage:
 *   node scripts/scrape-overpass.mjs [--city <slug>] [--bbox west,south,east,north] [--tiles NxM]
 *
 * Defaults:
 *   --city   quad_cities
 *   --bbox   -90.60,41.51,-90.54,41.55   (downtown Davenport core)
 *   --tiles  1x1                          (single fetch, no tiling)
 *
 * Tiling: full QC (`-90.7,41.4,-90.4,41.7`) overruns the Overpass 1 GB
 * response cap on the buildings query. Split with e.g. `--tiles 3x3` to
 * fetch 9 quadrants sequentially with backoff between calls. Adjacent
 * tiles share edge features; dedup is keyed on feature.properties.id
 * (OSM way/node id), so the merged output is unique.
 */

import { writeFileSync, mkdirSync } from "node:fs";
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
const bboxStr = arg("bbox", "-90.60,41.51,-90.54,41.55");
const tilesStr = arg("tiles", "1x1");
const [west, south, east, north] = bboxStr.split(",").map(Number);
const [tileCols, tileRows] = tilesStr.split("x").map((n) => Math.max(1, parseInt(n, 10) || 1));

if ([west, south, east, north].some(Number.isNaN)) {
  console.error("Invalid --bbox. Format: west,south,east,north (lng_min,lat_min,lng_max,lat_max)");
  process.exit(1);
}
if (west >= east || south >= north) {
  console.error("Invalid --bbox: west must be < east and south must be < north");
  process.exit(1);
}

const outDir = resolve(repoRoot, "public", "data", city);
mkdirSync(outDir, { recursive: true });

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "operator-sim/0.1 (+https://github.com/kjhholt-alt/operator-sim)";

function queries(t) {
  const bb = `${t.south},${t.west},${t.north},${t.east}`;
  return {
    roads: `[out:json][timeout:180];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street)$"](${bb}););out tags geom;`,
    buildings: `[out:json][timeout:180];(way["building"](${bb}););out tags geom;`,
    addresses: `[out:json][timeout:180];(node["addr:housenumber"]["addr:street"](${bb}););out tags;`,
  };
}

async function fetchOverpass(query, label, attempt = 1) {
  console.log(`[overpass] ${label}${attempt > 1 ? ` (retry ${attempt})` : ""}`);
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if ((res.status === 429 || res.status === 504 || res.status === 502) && attempt < 4) {
    const wait = attempt * 5000;
    console.log(`[overpass] ${label} ${res.status}, backing off ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchOverpass(query, label, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Overpass ${label} failed: ${res.status} ${res.statusText}${body ? " — " + body.slice(0, 200) : ""}`);
  }
  const json = await res.json();
  const ms = Date.now() - t0;
  console.log(`[overpass] ${label} -> ${json.elements?.length ?? 0} elements in ${ms}ms`);
  return json;
}

function waysToFeatures(elements, kind) {
  const features = [];
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { id: `${kind}/${el.id}`, ...(el.tags ?? {}) },
      geometry: { type: "LineString", coordinates: el.geometry.map((p) => [p.lon, p.lat]) },
    });
  }
  return features;
}

function buildingsToFeatures(elements) {
  const features = [];
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 3) continue;
    features.push({
      type: "Feature",
      properties: { id: `building/${el.id}`, ...(el.tags ?? {}) },
      geometry: { type: "Polygon", coordinates: [el.geometry.map((p) => [p.lon, p.lat])] },
    });
  }
  return features;
}

function nodesToAddresses(elements) {
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

function buildTiles(west, south, east, north, cols, rows) {
  const tiles = [];
  const dx = (east - west) / cols;
  const dy = (north - south) / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      tiles.push({
        index: j * cols + i,
        west: west + i * dx,
        south: south + j * dy,
        east: west + (i + 1) * dx,
        north: south + (j + 1) * dy,
        label: `tile ${j * cols + i + 1}/${cols * rows} (${i},${j})`,
      });
    }
  }
  return tiles;
}

async function main() {
  console.log(`[scrape] city=${city} bbox=[${west},${south},${east},${north}] tiles=${tileCols}x${tileRows}`);
  console.log(`[scrape] output: ${outDir}`);

  const tiles = buildTiles(west, south, east, north, tileCols, tileRows);
  const roadsById = new Map();
  const buildingsById = new Map();
  const addressesById = new Map();

  for (const t of tiles) {
    const q = queries(t);
    console.log("");
    console.log(`[scrape] ${t.label} bbox=[${t.west.toFixed(4)},${t.south.toFixed(4)},${t.east.toFixed(4)},${t.north.toFixed(4)}]`);
    const roads = await fetchOverpass(q.roads, `${t.label} roads`);
    await new Promise((r) => setTimeout(r, 1500));
    const buildings = await fetchOverpass(q.buildings, `${t.label} buildings`);
    await new Promise((r) => setTimeout(r, 1500));
    const addresses = await fetchOverpass(q.addresses, `${t.label} addresses`);
    await new Promise((r) => setTimeout(r, 1500));

    for (const f of waysToFeatures(roads.elements ?? [], "way")) {
      if (!roadsById.has(f.properties.id)) roadsById.set(f.properties.id, f);
    }
    for (const f of buildingsToFeatures(buildings.elements ?? [])) {
      if (!buildingsById.has(f.properties.id)) buildingsById.set(f.properties.id, f);
    }
    for (const a of nodesToAddresses(addresses.elements ?? [])) {
      if (!addressesById.has(a.id)) addressesById.set(a.id, a);
    }
  }

  const roadsGeo = { type: "FeatureCollection", features: Array.from(roadsById.values()) };
  const buildingsGeo = { type: "FeatureCollection", features: Array.from(buildingsById.values()) };
  const addressList = Array.from(addressesById.values());

  writeFileSync(resolve(outDir, "roads.geojson"), JSON.stringify(roadsGeo));
  writeFileSync(resolve(outDir, "buildings.geojson"), JSON.stringify(buildingsGeo));
  writeFileSync(resolve(outDir, "addresses.json"), JSON.stringify(addressList));

  console.log("");
  console.log(`✓ roads:     ${roadsGeo.features.length} features (deduped)`);
  console.log(`✓ buildings: ${buildingsGeo.features.length} features (deduped)`);
  console.log(`✓ addresses: ${addressList.length} entries (deduped)`);
  console.log("");
  console.log(`done. files in ${outDir}`);
}

main().catch((err) => {
  console.error("[scrape] FAILED:", err.message);
  process.exit(1);
});
