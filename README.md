# Operator Sim

> Foundry-grade dispatch sim. Real-OSM map. Command fire / EMS / police / SWAT.
> 911 Operator pacing. Door Kickers tactical depth. Palantir Maven aesthetic.

**Status:** Day 0 — bootstrap. Vertical slice targeted **week 4** (early June 2026).
**End-of-year goal:** Steam Early Access launch by **2026-12-31**. See [`docs/GDD.md`](docs/GDD.md) § 11 for the 8-phase roadmap.

## What this is

You're not a city manager moving cute trucks around a cartoon map. You're a watchstander on the floor. You see units, incidents, callers, addresses, and intel as linked entities. You give verbs. They flow through the floor. People are saved or they aren't.

Inspirations: **Global Rescue** (real-OSM tycoon), **911 Operator** (calm pace, narrative), **Door Kickers 2** (tactical layer — deferred), **Palantir Foundry / Maven Smart System** (the *interface* IS the differentiator).

## Stack

- Vite + React 19 + TypeScript + Tailwind 4
- Tauri 2 desktop wrap (Steam-ready binary)
- MapLibre GL + deck.gl (free OSM tiles, no Mapbox lock-in)
- shadcn/ui + Radix + cmdk (Foundry input model)
- tldraw v3 (ontology canvas)
- zustand + dexie (state + IndexedDB)
- recharts (sparklines + KPIs)

## Run

```bash
npm install
npm run dev          # browser preview at localhost:1420
npm run tauri:dev    # native desktop with Rust backend
npm run tauri:build  # produces .exe / .app / .deb
```

## Layout

```
src/
  components/
    shell/           — top strip, rails, map, command palette, ticker
    ontology/        — entity browser, dossier, linked-entity drill-downs (Day 3)
    map/             — MapLibre + deck.gl layers (Day 2)
    sim/             — tick loop, FSMs, pathfinding (Day 2-3)
  data/              — baked OSM addresses, road graph, content library
  lib/               — utilities, types, schemas
  state/             — zustand stores, dexie schemas
agents/              — 7-role autonomous build team (one folder per role)
docs/
  GDD.md             — game design doc
  CLAUDE_DESIGN_PROMPTS.md — prompts for claude.ai/design
  research/          — Researcher agent dossiers
src-tauri/           — Rust backend
```

## The autonomous build pipeline

This game is being built ~95% by Claude across an 8-month run (May 2026 → Dec 2026 EA). See [`docs/GDD.md`](docs/GDD.md) and [`agents/`](agents/) for the role breakdown. Touchpoints arrive via Discord `#claude-chat` as A/B questions.

Built in the operator's chair by [@kjhholt-alt](https://github.com/kjhholt-alt).
