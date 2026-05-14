# Operator Sim — Press Kit / One-Pager

> Send this URL to streamers, sim-press, dispatch professionals, and the
> handful of dispatch-sim YouTubers (Carbon, Eevomeer, Tank Mobile). Keep
> it short, no fluff, no marketing-deck language.

---

## Title

**Operator Sim**

## Tagline (under 50 chars)

A dispatch simulator on the city you live in.

## One-line pitch (under 140 chars)

Fire, EMS, police, SWAT — your console, your call, your shift. Real OSM roads, multi-agency dispatch, no spectacle.

## Three-sentence pitch

You are the dispatcher on the floor — not behind the wheel. Real
Davenport streets baked from OpenStreetMap, eight units across two stations,
incidents that demand the right kit at the right time. Forty-eight real
seconds is a full shift; the wrong unit on a SWAT-required apex is a
career grade-drop.

---

## Quick facts

| | |
|---|---|
| **Genre** | Dispatch simulator · Real-time tactical |
| **Players** | Single-player |
| **Platforms** | Windows (Steam) · Web demo at [operator-sim.vercel.app](https://operator-sim.vercel.app) |
| **Engine** | Custom (TypeScript + React + Vite + MapLibre + deck.gl), Tauri for desktop wrapper |
| **Development** | Solo, daily devlogs · No publisher |
| **Release** | Early Access target **2026-12-31** |
| **Wishlist** | Steam page provisioning in Phase 4 (link will go here) |
| **Demo** | Live now — no download required |

---

## What's playable today (web demo)

- **Three difficulty tiers** of shifts gated behind career progression
  - Tier 1: 5 incidents, 12 game-min, ~48 real seconds
  - Tier 2: 7 incidents, multi-unit dependencies
  - Tier 3: 9 incidents across 3 narrative arcs, including police-led apex events
- **Eight units across two stations:**
  Engine-1, Ladder-2, Ambulance-3, Ambulance-4, Patrol-5, Patrol-6, K9-1, S1 (SWAT-armored)
- **Real OSM-baked roads** — 26,478 road segments, 39,274 buildings, 270 addresses across the full Quad Cities bbox
- **Save / replay / forget** — Dexie-backed snapshots, study your worst calls
- **Verb-based command palette** (Ctrl+K) — `dispatch`, `assign`, `start`, `save`, `replay`, `lobby`, `end_shift`
- **Agency-aware filtering** — `medical_*` incidents only pull ambulances; `police_*` only patrol/K9/SWAT; etc.

## What makes it different

1. **You don't drive.** No vehicle physics, no chase camera. You assign,
   then you watch. Pace > spectacle. The interface is the differentiator.
2. **It's the city you live in.** OSM bake of Davenport, IA — real roads,
   real addresses, real neighborhood names. Not procgen.
3. **Multi-agency consequence.** A medical-only call routed to an engine
   wastes the engine. A SWAT-required apex routed to a patrol is a grade
   drop. The mistakes are *legible*.
4. **No tycoon meta.** No infinite money, no hire/fire screens, no
   skill-tree dopamine. Three tiers, three grades, replay your worst.
5. **Foundry / Palantir aesthetic.** No cartoon UI, no comic-book lights,
   no health-bar-style HUD. Mono kicker, dense data, single-pixel grid.

## What's coming

| Phase | Target | What ships |
|-------|--------|------------|
| 2 (now) | Q2 2026 | Variety unlock — save/replay, police agency, career gating, Steam coming-soon |
| 3 | Q3 2026 | Multi-shift career mode, scoring metadata, persistent agency reputation |
| 4 | Q3 2026 | Steam appid provisioned, capsule live, devlog cadence locked |
| 5 | Q4 2026 | Demo on Steam (currently web-only), Steam page live |
| 6–8 | Q4 2026 | EA polish, additional cities (test: Cedar Rapids), launch build |

## Press contact

- **Dev:** Kruz Holt — [kjh.holt@gmail.com](mailto:kjh.holt@gmail.com)
- **Devlogs:** [github.com/kjhholt-alt/operator-sim](https://github.com/kjhholt-alt/operator-sim) — weekly, Sundays 17:00 CT
- **Discord:** *coming with Phase 4*

## Screenshots — selects

> Stable as of Day 14 build (v0.0.14-day14). Captured at 1920×1080 native.
> Asset paths will land in `docs/steam/assets/` after the capsule design
> pass on claude.ai/design (P7-screenshot-* prompts).

- `assets/screenshot_iso_dispatch.png` — 2.5D iso city view with three live incidents and routed units
- `assets/screenshot_maplibre_routing.png` — top-down OSM view, dispatched ambulance mid-route
- `assets/screenshot_shift_summary.png` — end-of-shift grade card, three narrative arcs resolved
- `assets/screenshot_command_palette.png` — Ctrl+K palette mid-dispatch with verb autocomplete
- `assets/screenshot_iso_night_cycle.png` — same city view, night cycle, three incidents glowing

## Logos & marks

- `assets/logo_horizontal.svg` — "OPERATOR SIM" mono + cyan dot, 600×80
- `assets/logo_stacked.svg` — kicker + title, square 400×400
- `assets/wordmark_mono.svg` — mono-only, for inline use

(All marks pending capsule pass; placeholders until P7-* designs land.)

## Music & sound credits

- **Atmospheric bed** — TBD (license-cleared CC-BY tracks)
- **No sirens, no chase audio.** Soundscape is the dispatch room: terminal hum, radio crackle on incoming, no melody.

## Press copy — short paragraph (for embed in articles)

*Operator Sim is a single-player dispatch simulator from solo dev Kruz Holt,
in development for Steam Early Access in 2026. The web demo is playable now
at operator-sim.vercel.app — no download required. The game runs on real
OpenStreetMap road data baked from Davenport, IA, with eight units across
two stations, three tiers of shifts, and a career mode gated behind grade
performance. The interface — dense, mono-typed, Palantir-grade — is the
differentiator: you don't drive the units, you assign them, then you watch
the consequences play out. Twelve minutes of game time per shift, forty-eight
real seconds. Multi-agency consequence is the mechanic; pace, not spectacle,
is the pitch.*

---

## License (this press kit)

CC-BY 4.0. Use it. Quote it. Embed the demo URL. Email if you want
higher-resolution renders of any asset.
