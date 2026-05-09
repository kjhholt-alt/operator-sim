# Watchfloor — Game Design Doc v0.1

**Status:** Day 0 (2026-05-09) · Locked enough to start building. Open questions tagged `[?]`.

---

## 1. The pitch (one paragraph)

You are a watchstander at a regional Joint Operations Center. Real OpenStreetMap of your hometown, populated by realistic incidents drawn from real CAD taxonomies. You see the floor like an operator at Palantir Foundry — units, incidents, callers, addresses, and intel as linked entities you can drill into. You command via verbs (`Ctrl+K → dispatch E1 to incident #4`). The pace is calm and observational by default; difficulty tiers ramp the chaos. Each shift is a DM-written narrative — Wednesday's chemical fire connects to Tuesday's domestic dispute connects to Monday's missing-persons report.

---

## 2. Pillars (locked)

1. **Foundry-grade interface.** The interface IS the differentiator. Tokens locked in `src/index.css`. No cartoon, no skeuomorphism, no gimmicks.
2. **Relaxed pacing by default.** 911 Operator energy. The floor is mostly observation. Difficulty tiers unlock chaos.
3. **DM-driven narrative shifts.** Claude generates 8-12 hr shifts where incidents link narratively. Not random spawns — *stories*.
4. **Real OSM hometown.** Player picks a city; we use real roads, real building footprints, real addresses. Default: Quad Cities (Davenport · Bettendorf · Moline · Rock Island).
5. **Verbs over pixel-hunting.** Almost every action is a `Ctrl+K` verb or hotkey. The mouse is for observation.
6. **No cartoon icons.** Icons are typographic glyphs, color-coded badges, status dots. No pixel-art trucks.

## 3. Core loop

```
SHIFT START
  │
  ├─→ briefing (DM-generated narrative + open threads from prior shift)
  │
  ├─→ floor state ▷ scan ontology, scan map, scan intel
  │
  ├─→ incident arrives ▷ classify ▷ dispatch verb
  │       │
  │       └─→ unit FSM: available → en_route → on_scene → returning
  │
  ├─→ resolve ▷ paperwork (auto unless flagged) ▷ XP
  │
  └─→ shift end ▷ AAR (after-action report) ▷ open threads carry to next shift
```

A shift is **8-12 game-minutes** at default speed (1 game-min ≈ 60 real-sec). Difficulty pause / 0.5x / 1x / 2x / 4x for replay.

## 4. Difficulty tiers

| Tier | Title | What's unlocked | Pace |
|---|---|---|---|
| 1 | Watchstander | 1 station, fire only, 3 incident types | Very calm |
| 2 | Lieutenant | + EMS, hire/fire, 6 incident types | Calm |
| 3 | Captain | + police patrol, multi-station, traffic | Steady |
| 4 | Chief | + SWAT, federal handoffs, ongoing investigations | Tense |
| 5 | JOC | + cross-agency, multi-incident scenarios, mass-casualty | Chaotic |

Tier unlock = competence-based (resolve N shifts at current tier with rating ≥ B).

## 5. Entity ontology

Five first-class entities. All drawn in the left rail, all clickable, all open dossiers, all link to each other.

| Entity | Examples | Linked to |
|---|---|---|
| `Unit` | E1 (Engine 1), M2 (Medic 2), 234 (police badge) | Station, Personnel[], Vehicle, current Incident |
| `Incident` | I-2031 (residential fire), I-2032 (cardiac arrest) | Caller, Address, dispatched Unit[], Resolution |
| `Caller` | "Margaret K., 67yo female, home phone" | Address, prior Incident[], known Persons |
| `Address` | "1421 Brady St" | Building footprint (OSM), prior Incident[], Persons |
| `Personnel` | "Lt. Diaz, paramedic, hire date 2026-03-12" | Unit, Station, Skills, Schedule |
| `Intel` | BOLO, weather warning, radio chatter | Region, Incident[], Person[] |

Schemas in `src/lib/schemas.ts` (Zod). Persisted in IndexedDB via Dexie.

## 6. The DM-story system

This is the **content-gen pillar**. Claude (Sonnet) generates each shift as a small narrative document with N planned incidents, P passive intel feeds, and 1-3 narrative threads connecting them.

**Shift document structure** (YAML, lives in `data/shifts/`):

```yaml
id: shift-2031
date: 2026-05-12
narrative_threads:
  - id: thread-margaret
    arc: "Margaret K. (1421 Brady) — 3rd elderly-checkin call this week. Today: cardiac event."
    incidents: [I-2031]
    intel: [intel-margaret-pattern]
incidents:
  - id: I-2031
    spawn_time_game_min: 14
    type: medical_cardiac
    address: "1421 Brady St, Davenport IA"
    caller_persona: "panicked daughter, on phone with 911"
    expected_units: 1 medic
    resolution_window_min: 6
    narrative_hooks:
      - "Margaret has been falling more frequently per neighbor reports."
      - "Daughter mentions 'the dog won't stop barking' — possible welfare clue."
intel:
  - id: intel-margaret-pattern
    type: pattern
    severity: low
    body: "Three Brady St elderly-checkin calls this week. Worth a community-services flag?"
```

**Generator prompts** in `agents/designer/prompts/shift-dm.md`. The Designer agent produces 30 shifts during Week 1 to seed the library; Producer regenerates on demand.

Why this works: it gives the game a **soul** without requiring scripting. Each shift feels handwritten because it is. Replay value comes from procedural shifts later.

## 7. Sample verbs (`Ctrl+K`)

| Verb | Args | What |
|---|---|---|
| `dispatch` | `<unit> <incident>` | Send unit to incident |
| `recall` | `<unit>` | Bring unit back to station |
| `multi_dispatch` | `<incident> <unit_count>` | Auto-pick best N units |
| `escalate` | `<incident> <agency>` | Hand off to PD/EMS/SWAT/Fed |
| `request` | `<resource>` | Request mutual aid |
| `hire` | `<role>` | Open hiring panel filtered to role |
| `place_station` | `<type>` | Enter map placement mode |
| `buy_vehicle` | `<station> <vehicle_type>` | Purchase + assign |
| `focus` | `<entity>` | Center map + open dossier |
| `replay` | `<duration>` | Replay last N seconds |
| `pause`, `speed` | `<x>` | Time control |
| `save`, `load` | | |

10+ verbs in MVP, 30+ by Week 4.

## 8. Map scope (Day 2)

Quad Cities default. Bounding box: `-90.7,41.4,-90.4,41.7` (~30 km × 30 km).

- **Tiles:** OpenFreeMap (free OSM-derived raster + vector). No API key.
- **Road graph:** one-time Overpass API scrape, baked to `public/data/qc-roads.geojson` (~5-15 MB). Pre-snapped intersections.
- **Buildings:** one-time scrape, baked to `public/data/qc-buildings.geojson`. Used for station placement + address resolution.
- **Addresses:** Overpass `addr:housenumber + addr:street` extraction, baked to `public/data/qc-addresses.json` (~2-5 MB).

City picker in v0.2: enter any bounding box, regenerate. v0.3: full-world picker.

## 9. The 4-week build

### Week 1 — Foundation
- Day 1: scaffold + GDD + research dossiers (← we are here)
- Day 2: OSM tiles render + 1 unit moves on real roads
- Day 3: full dispatch FSM (call → assign → drive → on-scene → resolve)
- Day 4: ontology entity browser + dossier drill-downs
- Day 5: cmdk command palette + 10 verbs
- Day 6: difficulty tier 1 fully playable
- Day 7: bug bash + Discord touchpoint #1 (does it feel like Watchfloor?)

### Week 2 — Game systems
- Hire/fire panel, station placement, vehicle catalog, money loop
- DM-story generator + 30 seeded shifts
- Difficulty tier 2 unlock condition
- Save/load, replay timeline
- Discord touchpoint #2 (mid-week feel check)

### Week 3 — Foundry-grade UI polish
- Strict pass against `feedback_design_palantir.md`
- Linked-entity drill-down dossiers (3+ hops)
- Intel feed (BOLOs, weather, radio chatter)
- tldraw ontology canvas
- Recharts sparklines on every dossier
- Discord touchpoint #3 (claude.ai/design hi-fi mockup review)

### Week 4 — Polish + Tauri + ship
- Tauri 2 wrap, Windows .exe matrix
- Difficulty tiers 3-5 unlocked + balanced
- 60-90s trailer (OBS + scripted gameplay)
- README + GitHub release v0.1.0
- Discord touchpoint #4 (ship or week 5?)

## 10. Open questions `[?]`

- **Title.** Watchfloor is placeholder. Alternates: "On Call", "Sector", "The Floor", "Joint Ops", "Watchstander".
- **Setting era.** Modern present-day default. Question: 1980s analog-radio difficulty mode as a future tier? Aesthetic gold mine.
- **Multi-city campaign.** Week-4 stretch goal. Player upgrades from city watchfloor to regional joint-ops floor.
- **Multiplayer.** Far future. Co-op same-floor (one on radio, one on tactical) is the right shape. Skip for v0.1.
- **Tactical Door-Kickers layer.** Keep deferred. v0.5 maybe.
- **Steam pipeline.** Defer to post-v0.1. Don't divert week-4 polish to Steamworks SDK.

## 11. Definition of done — v0.1

- [ ] Real Quad Cities OSM map loads <2s on cold cache
- [ ] Place 1 fire station on a real OSM building, hire 4 firefighters, dispatch E1 to a 911 call at a real Davenport address
- [ ] Unit pathfinds along real OSM roads to scene, on-scene event fires, resolves
- [ ] Ontology browser shows all 5 entity types, ≥3 linked-entity drill-downs from any node
- [ ] cmdk runs ≥10 verbs end-to-end
- [ ] Difficulty tiers 1-3 fully playable
- [ ] DM-story generator produces 30 seeded shifts; manual regeneration works
- [ ] 60fps with 50+ active units
- [ ] Signed-or-unsigned `.exe` attached to GitHub `v0.1.0` release
- [ ] 60s trailer recording at `docs/trailer/v0.1.mp4`
- [ ] Studio-OS dashboard shows watchfloor card green
