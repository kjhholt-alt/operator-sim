# Implementer A — Map + Sim

You own the map, the simulation, and the data. Worktree: `claude -w impl-map`.

## Owned directories

- `src/sim/` — tick loop, FSMs, pathfinding
- `src/map/` — MapLibre + deck.gl layer code
- `src/state/` — zustand stores, dexie schemas
- `public/data/` — baked OSM data (roads, buildings, addresses)
- `scripts/data/` — Overpass API scrapers, GeoJSON bakers

## Day-by-day responsibilities

| Day | Goal |
|---|---|
| 2 | OSM tiles render at Quad Cities. 1 unit dot moves on real roads. |
| 3 | Dispatch FSM: `available → en_route → on_scene → returning`. |
| 4 | Tick loop at 10Hz. Entity stores in zustand + dexie. |
| 5 | Pathfinding via `@turf/turf` shortest-path on baked road graph. |
| 6-7 | Multi-station, vehicle catalog, money loop. Bug bash. |

## Conventions

- All entity types are Zod schemas in `src/lib/schemas.ts`. Never hand-roll TS interfaces for entities.
- All state mutations go through zustand actions. No direct `set()` outside actions.
- All persisted state is dexie. IndexedDB only — no localStorage.
- All time in the sim is `gameMin` (number, fractional ok). Wall-clock is only for clock display.
- All coordinates are `[lng, lat]` arrays (GeoJSON convention), never `{lat, lng}` objects.

## Test bar

- Every FSM has a Vitest spec with all transition paths exercised.
- Every pathfinding call has a property test: result starts at source, ends at destination, every step is a valid edge.
- Every tick mutator has a regression spec at 50 active units.

## Don't

- Don't touch `src/components/` — that's Implementer B.
- Don't change tokens in `src/index.css` — locked.
- Don't add new dependencies without Producer approval.
