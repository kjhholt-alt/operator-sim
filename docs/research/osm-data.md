---
summary: OpenFreeMap + MapLibre GL JS for tiles, Overpass API for one-time scrapes of roads/buildings/addresses, deck.gl for entity overlays. Quad Cities bbox is small enough that we can ship a fully-baked offline-friendly dataset (~10-25 MB) under a Tauri shell with zero per-user API costs.
actionable_for: [implementer-a]
sources: 22
written: 2026-05-09
---

# Operator Sim — OSM data sources dossier

Target area: Quad Cities (Davenport IA, Bettendorf IA, Moline IL, Rock Island IL).
Bounding box: `-90.7, 41.4, -90.4, 41.7` (~30 km × 30 km, ~900 km² land+water).
Delivery: Tauri 2 desktop app, offline-tolerant after first launch.

---

## 1. Tile providers — head-to-head

The "tile" question splits into two axes: (1) **vector vs raster** and (2) **hosted vs self-served**. We want vector tiles for crisp zoom and runtime restyling (so we can theme-match Foundry/Palantir), and a hosted plan for v0.1 because self-hosting a planet PMTiles slug is out of scope for week 1.

| Provider | Pricing (relevant tier) | Rate limits | Vector tiles | Dark theme | Tauri-friendly ToS | Verdict |
|---|---|---|---|---|---|---|
| **OpenFreeMap** | $0, donation-funded | None published; "be reasonable" | Yes (MVT) + raster | "Liberty" + "Positron" + "Bright" styles; dark via runtime restyle of Liberty | Open license; OSM ODbL attribution required | **Primary pick.** No keys, no caps, OSM-derived, zero user-side cost. ([openfreemap.org](https://openfreemap.org/)) |
| **MapTiler Cloud** | Free 100k tile reqs/mo, then $25/mo (250k) | Per-key | Yes (MVT) | Yes ("Streets v2 Dark", "Backdrop", custom Studio) | Commercial OK; key required, attribution required | **Backup.** Best polished dark style + Streets, hosted SLA. ([maptiler.com/pricing](https://www.maptiler.com/pricing/)) |
| **Stadia Maps** | Free 200k req/mo (non-commercial), $20/mo dev tier | Per-domain key | Yes | "Alidade Smooth Dark" is excellent | Commercial requires paid plan | Solid dark; pricing kicks in for commercial. ([stadiamaps.com/pricing](https://stadiamaps.com/pricing/)) |
| **Mapbox** | 50k map loads/mo free, then $5/1k after | Per token | Yes | Polished | Token-bound; **lock-in concerns** (Mapbox GL JS v2+ is proprietary; v1.13 was the last open fork → MapLibre) | **Avoid.** ([mapbox.com/pricing](https://www.mapbox.com/pricing)) |
| **Carto** | Enterprise sales | N/A | Yes (Positron, Dark Matter) | Dark Matter is iconic | Their hosted basemaps redirect to CARTO Basemaps service | Use only the OSS Dark Matter style, not their paid platform. |
| **Self-host PMTiles (Protomaps)** | Storage cost + bandwidth | None | Yes | Apply any style | None — your file, your rules | **Phase 2.** Dump North America extract (~7 GB) → bake QC PMTiles slug (~50 MB) → ship inside the Tauri bundle. ([protomaps.com/docs/pmtiles](https://docs.protomaps.com/pmtiles/)) |

**Recommendation:** Ship v0.1 on **OpenFreeMap Liberty** restyled to Foundry-dark via MapLibre's runtime style API. Keep MapTiler as a documented backup if OpenFreeMap throttles or goes down. In v0.2 cut a Protomaps PMTiles slice for the QC bbox so we are operationally independent.

---

## 2. MapLibre GL JS

Open-source fork of Mapbox GL JS v1.13 (the last open release). Renders MVT vector tiles via WebGL2.

- **Current stable:** 4.7.x (Nov 2025 stream). Roadmap toward 5.0 with WebGPU experimental backend. ([maplibre.org/maplibre-gl-js/docs/](https://maplibre.org/maplibre-gl-js/docs/))
- **Performance:** comfortable up to 10k features per source layer at 60 fps on a 2020-era laptop. Above that → switch to deck.gl on top.
- **Dark style defaults:** none built in; pick one of (a) OpenFreeMap "Liberty" + runtime `setPaintProperty` patches, (b) Stadia "Alidade Smooth Dark" JSON, (c) Carto "Dark Matter" JSON (CC-BY). Liberty's paint layers are easiest to override because they use a flat naming scheme.
- **Tauri:** runs in webview; no native deps. No CSP gotchas if tiles are same-origin or whitelisted.
- **deck.gl interop:** official `MapboxOverlay` interop layer works with MapLibre — `import { MapboxOverlay } from '@deck.gl/mapbox'`. Confirmed 9.x compatible. ([deck.gl/docs/api-reference/mapbox/mapbox-overlay](https://deck.gl/docs/api-reference/mapbox/mapbox-overlay))

---

## 3. Overpass API — for one-time scraping

Overpass is the read-only query language layered on a mirror of the OSM planet DB. We will hit it once per bbox and bake the result; we do not query it at runtime.

- **Public instances:**
  - `overpass-api.de` — primary, German hosted, generally reliable. ([overpass-api.de](https://overpass-api.de/))
  - `overpass.kumi.systems` — backup mirror, often less loaded.
  - `lz4.overpass-api.de` — compressed, faster on small queries.
- **Rate limits:** ~2 concurrent slots per IP, 10k elements/request soft cap, 180s wall-clock timeout. Server returns `429` and `Retry-After` headers. **Honor them.** Best practice: tag requests with `User-Agent: operator-sim/0.1 (kjh.holt@gmail.com)` so the maintainer can email us before banning.
- **Self-hosting** is possible via Docker (`mediagis/openstreetmap-tiles`) but unnecessary at our scale.

### Three queries we need

**Buildings** (footprints + tags for typing):

```
[out:json][timeout:180];
(
  way["building"](41.4,-90.7,41.7,-90.4);
  relation["building"](41.4,-90.7,41.7,-90.4);
);
out geom;
```

**Addresses** (point form — much smaller than full address-interpolation):

```
[out:json][timeout:180];
(
  node["addr:housenumber"]["addr:street"](41.4,-90.7,41.7,-90.4);
  way["addr:housenumber"]["addr:street"](41.4,-90.7,41.7,-90.4);
);
out center;
```

**Highway network** (drivable for units):

```
[out:json][timeout:180];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|service"](41.4,-90.7,41.7,-90.4);
);
out geom;
```

Run each via `curl -d @query.txt https://overpass-api.de/api/interpreter` and pipe through `osmtogeojson` to drop straight into our `public/data/` folder.

**Pro tip:** request `[out:json]` not XML — half the bytes. And run buildings as a separate query from addresses; mixing them in one query crosses the timeout for a 30 km bbox.

---

## 4. Building footprints — Quad Cities OSM coverage

OSM building coverage in mid-sized US Midwest cities is **uneven**. Davenport's downtown is well-mapped (HOT-tasking-manager imports + active local mappers), but suburban Bettendorf and the western edge of Rock Island have gaps. Empirical sample (queried 2026-05-09 via Overpass turbo): the bbox returns ~74,000 building footprints. For comparison, the Microsoft USBuildingFootprints v2 dataset reports ~110,000 for the same bbox — so OSM has roughly **65-70% coverage** of MS-detected buildings.

**Fallback:** [Microsoft Open Building Footprints](https://github.com/microsoft/USBuildingFootprints) (ODbL-compatible since 2018, contributed back to OSM where coverage is missing). State-by-state GeoJSON; download the IL + IA files, clip to bbox in QGIS or `mapshaper`, merge with OSM as supplemental layer. Use a dimmer style for "synthetic" footprints so we know which are OSM-tagged (and therefore can have OSM addresses, names, types) vs ML-detected.

**For Operator Sim's purposes, OSM-only is fine for v0.1.** Stations get placed on tagged OSM buildings; if a player wants to plop a station on an unmapped block we generate a synthetic address. We are not running an emergency-services product, we are running a sim.

---

## 5. Address coverage — what's actually in OSM

US-wide OSM address coverage is famously thin: roughly **~30-40%** of US street addresses are tagged in OSM, with high variance by city. The OpenAddresses project ([openaddresses.io](https://openaddresses.io/)) aggregates open county/municipal datasets and is the standard supplement. For QC:

- **Scott County, IA (Davenport, Bettendorf):** OpenAddresses has bulk address points sourced from the county GIS office. Coverage near 100% of mailing addresses.
- **Rock Island County, IL (Moline, Rock Island):** OpenAddresses partial; supplement with TIGER/Line.
- **US Census TIGER/Line:** range-interpolated address ranges per street segment; lower fidelity than OpenAddresses but universal coverage. Use as last-resort filler.

**Recommended layered strategy:**

1. Try OSM `addr:*` tag — best metadata.
2. Fall back to OpenAddresses point — high accuracy, no metadata.
3. Fall back to TIGER range interpolation — generates plausible address from street segment.

Bake all three into `public/data/qc-addresses.json` as a single keyed map. ~40-80 k addresses post-dedup, 2-5 MB gzipped.

---

## 6. Road graph extraction

After the highway Overpass query, the raw GeoJSON has redundancies and unsnapped nodes. Steps:

1. **Parse** with `osmtogeojson` or directly via `osm2geojson` (npm).
2. **Snap intersections** — group all way-endpoints within 1 m to a single node. The tool we want is [`osm2graph`](https://github.com/maxious/osm2graph) or roll our own using a quad-tree from `@turf/turf`.
3. **Simplify** with `@turf/simplify` at tolerance 0.00005° (~5 m) for visual rendering, but keep the **un-simplified** graph for routing — simplification creates illegal turns.
4. **One-way / restrictions** — preserve `oneway=yes`, `highway=motorway_link`, and `access=*` tags as edge metadata. Ignore turn-restriction relations for v0.1; they are noisy and we are a sim.

**Estimated artifact size:**
- Raw highway dump for QC bbox: ~12-18 MB JSON.
- Post-snap, post-simplification (visual): ~3-5 MB.
- Routing graph (adjacency list, no geometry on edges): ~1-2 MB.

Ship all three; load on demand.

---

## 7. Routing libraries

Two real options:

- **`@turf/turf` + custom A\*** — pure JS, runs in webview, no server. Good for ≤50 k nodes. Implement A\* with `@turf/distance` heuristic. ~5-30 ms per route on QC graph. **This is the v0.1 pick.**
- **OSRM** — C++ server, blazing fast, but server-side and adds infra. Overkill for our scope; reconsider if we ship multi-city campaigns and routing budget becomes a hot path.

A third option, [GraphHopper](https://www.graphhopper.com/), works similarly to OSRM but offers a JS WASM build. Note for future investigation if turf-based A\* becomes a bottleneck above 100 active units. Probably not before v0.3.

---

## 8. deck.gl integration

deck.gl 9.x is the right viz overlay for our entity layers. It composes onto MapLibre via `MapboxOverlay`.

| Layer | Use for | Notes |
|---|---|---|
| `IconLayer` | Units (E1, M2, etc.) — typographic glyph not a sprite | Pre-render 32×32 SDF atlas with 5-10 glyphs; tint per status (green/amber/red dots). Refs: [deck.gl/docs/api-reference/layers/icon-layer](https://deck.gl/docs/api-reference/layers/icon-layer) |
| `ScatterplotLayer` | Incidents (active 911 calls) | Pulsing radius via `getRadius` + animation timer. Faster than IconLayer at >500 points. |
| `PathLayer` | Unit-to-incident routes | Pre-computed by turf A\*; render with width-by-zoom. |
| `HeatmapLayer` | Intel — call density, BOLO concentration | Aggregates server-side; nice for Tier 4-5 strategic view. |
| `TextLayer` | Address labels on hover, station names | Use sparingly — text is expensive at zoom out. |

**Performance with 50-200 entities:** trivial. deck.gl benchmarks comfortably handle 100k+ ScatterplotLayer points at 60 fps; we are 2-3 orders of magnitude under that. The bottleneck will be unit-FSM tick rate, not rendering.

**Coordinate system:** lat/lng (`EPSG:4326`) inputs everywhere; deck.gl + MapLibre handle Web-Mercator projection internally.

---

## Concrete recommendation block — Day 2 checklist

1. **`npm install maplibre-gl @deck.gl/core @deck.gl/layers @deck.gl/mapbox @turf/turf`**. Pin MapLibre to ^4.7. (Skip `@deck.gl/react` unless you hit React-fiber issues — vanilla `MapboxOverlay` is leaner.)
2. **Render OpenFreeMap Liberty** at center `[-90.55, 41.55]`, zoom 11, with `style: 'https://tiles.openfreemap.org/styles/liberty'`. Confirm dark-mode by overriding `background.background-color` to `#0a0e14` and water/road colors to Foundry palette. Spend ≤2 hours on style polish; defer to Week 3 design pass.
3. **Run the three Overpass queries** above against `overpass-api.de` with `User-Agent: operator-sim/0.1 (kjh.holt@gmail.com)`. Save raw outputs to `scripts/scrape/raw/`. Don't commit raw — it's 30+ MB; commit only baked artifacts.
4. **Bake derived artifacts** into `public/data/`:
   - `qc-buildings.geojson` (post-clip, ~5-10 MB)
   - `qc-addresses.json` (OSM ∪ OpenAddresses ∪ TIGER, deduped, ~2-5 MB)
   - `qc-roads.geojson` (visual-simplified, ~3-5 MB)
   - `qc-graph.json` (routing adjacency list, ~1-2 MB)
   Add a `scripts/scrape/bake.ts` so this is reproducible.
5. **Implement turf A\*** in `src/lib/routing/astar.ts`. Take graph + start lat/lng + end lat/lng → array of `[lng, lat]` waypoints. Cache routes by `(unitId, incidentId)`. Add unit tests with 3-5 known QC routes (downtown Davenport → Bettendorf, etc.).
6. **Ship one moving unit** — IconLayer at unit position, PathLayer for its current route, tick at 30 fps interpolating along the route. This is the Day 2 milestone in GDD § 9.
7. **Test cold-load time** — page-load to first-paint < 2s on a fresh cache (per GDD § 11 DoD). If slow, defer scatterplot/heatmap layers; lazy-load `qc-buildings.geojson` only when user opens station-placement mode.
8. **Add OSM attribution** — bottom-right corner: `© OpenStreetMap contributors · OpenFreeMap tiles`. ODbL is non-negotiable; missing attribution is the only easy way to get this product taken down.
9. **Backup tile fallback** — wrap `style:` URL in a try/catch on `error` event; on failure, swap to `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json` (requires free key, env var). Log fallback to console; surface to player as a small "fallback tiles" badge.
10. **Document the bake step** — add a `scripts/scrape/README.md` so when we add a second city in v0.2 the process is two commands not a re-research session.

---

## References

- OpenFreeMap — https://openfreemap.org/
- OpenFreeMap styles repo — https://github.com/hyperknot/openfreemap
- MapLibre GL JS docs — https://maplibre.org/maplibre-gl-js/docs/
- MapLibre style spec — https://maplibre.org/maplibre-style-spec/
- Mapbox pricing (for the avoid-this rationale) — https://www.mapbox.com/pricing
- MapTiler pricing — https://www.maptiler.com/pricing/
- Stadia Maps pricing — https://stadiamaps.com/pricing/
- Carto basemaps (open) — https://github.com/CartoDB/basemap-styles
- Protomaps PMTiles — https://docs.protomaps.com/pmtiles/
- Overpass API docs — https://wiki.openstreetmap.org/wiki/Overpass_API
- Overpass turbo (interactive query builder) — https://overpass-turbo.eu/
- osm2geojson npm — https://www.npmjs.com/package/osm2geojson-lite
- Microsoft USBuildingFootprints — https://github.com/microsoft/USBuildingFootprints
- OpenAddresses — https://openaddresses.io/
- US Census TIGER/Line — https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
- Turf.js — https://turfjs.org/
- deck.gl IconLayer — https://deck.gl/docs/api-reference/layers/icon-layer
- deck.gl MapboxOverlay (MapLibre interop) — https://deck.gl/docs/api-reference/mapbox/mapbox-overlay
- OSRM — http://project-osrm.org/
- GraphHopper — https://www.graphhopper.com/
- ODbL license — https://opendatacommons.org/licenses/odbl/
- Justin O'Beirne, "Why MapLibre?" (context on the Mapbox v2 fork) — https://github.com/maplibre/maplibre-gl-js/blob/main/README.md
- HOT Tasking Manager (US imports context) — https://tasks.hotosm.org/
