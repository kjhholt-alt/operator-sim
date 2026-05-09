# Operator Sim — Game Design Doc v0.1

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
- Day 7: bug bash + Discord touchpoint #1 (does it feel like Operator Sim?)

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

- **Setting era.** Modern present-day default. Question: 1980s analog-radio difficulty mode as a future tier? Aesthetic gold mine.
- **Multi-city campaign.** Phase 2 goal. Player upgrades from single watchfloor to regional joint-ops floor.
- **Multiplayer.** Far future. Co-op same-floor (one on radio, one on tactical) is the right shape. Post-EA.
- **Tactical Door-Kickers layer.** Phase 6 (v0.5) — see § 11 roadmap. Optional unlock.

## 11. End-of-year goal — Steam Early Access launch by 2026-12-31

> Today: 2026-05-09. ~33 weeks runway. The 4-week sprint in § 9 produces the **vertical slice**; this section is the path from vertical slice → Steam EA build.

### Phase map

| Phase | Weeks | Calendar | Build | Outcome |
|---|---|---|---|---|
| 1 — Vertical Slice | 1-4 | May 2026 | v0.1 | Tier 1 playable end-to-end (see § 9). Kruz can dispatch a fire to a real Davenport address. |
| 2 — Depth + Polish | 5-10 | Jun-early Jul | v0.2 | Multi-city, save/load, replay, tiers 1-3 balanced, 60+ shifts in library. |
| 3 — Friends-Family Alpha | 11-14 | mid Jul | v0.3 | First non-Kruz playtester (Discord-recruited). Hard bug list closes. |
| 4 — Steamworks integration | 15-18 | late Jul-Aug | v0.4 | Steam Direct paid ($100), SteamPipe upload working, achievements + cloud saves wired. |
| 5 — Steam Page Live (Coming Soon) | 19-22 | Sep | v0.5 | Capsule art via claude.ai/design, 5 screenshots, 60s trailer, devlog cadence. **Wishlist drive begins.** |
| 6 — Tactical Layer + Open Beta | 23-26 | Oct | v0.6 | Door-Kickers-style tactical breach mode (optional). Steam playtest beta opens. |
| 7 — Content Lock + Balance | 27-30 | Nov | v0.9 | All 5 difficulty tiers complete. 200+ shifts. Steam Deck verification submitted. Press kit shipped. |
| 8 — EA Launch | 31-33 | Dec (target 2026-12-19) | v1.0-EA | Steam EA goes live. Post-launch hotfix cadence: daily for 7 days, weekly thereafter. |

### Steam shipping prerequisites (Phase 4 gates)

- [ ] **Steam Direct fee** ($100, refundable after $1k revenue) — Kruz to pay via Steamworks. One-time.
- [ ] **Steamworks partner agreement** — US tax forms, banking, age rating self-survey. ~1 day of paperwork.
- [ ] **Privacy policy + EULA** — generic templates work for EA. Kruz reviews before launch.
- [ ] **App ID assigned** — comes with Steam Direct payment. Drives `steam_appid.txt` for Tauri build.
- [ ] **Steamworks Rust crate** — `steamworks-rs` (community) or `tauri-plugin-steamworks` (early). Wired in `src-tauri/`.
- [ ] **SteamPipe upload** — `steamcmd.exe` automated in `.github/workflows/steam.yml`.

### Storefront content (Phase 5 deliverables)

| Asset | Spec | Source |
|---|---|---|
| Main capsule | 1920×620 | claude.ai/design — see `docs/CLAUDE_DESIGN_PROMPTS.md` § P7 (to write) |
| Small capsule | 462×174 | derivative |
| Header | 460×215 | derivative |
| Library hero | 3840×1240 | claude.ai/design |
| Library logo | 1280×720 transparent PNG | claude.ai/design |
| Screenshots | 5 minimum at 1920×1080 | OBS + Playwright-scripted gameplay |
| Trailer | ≥30s at 1920×1080 60fps | OBS + cuts in DaVinci Resolve via computer-use |
| Short description | 300 chars | Producer agent |
| Long description | Markdown-ish | Producer agent |
| Tags | up to 20 | from Steam tag library |
| System requirements | min/rec | derived from Tauri build matrix |

### Marketing rhythm (Phases 5-8)

- **Devlog cadence:** weekly Discord post + monthly written devlog on `operator-sim.dev` (Vercel landing page).
- **Wishlist target:** 5,000 by EA launch (≈industry baseline for sustainable EA). Stretch: 10,000.
- **Channels:** /r/IndieDev, /r/EmergencyServices (operator audience), /r/Palantir (interface enthusiasts), TIGSource forums, IndieDB, X/Twitter (game-dev side).
- **Press list:** PCGamer indie tips, RockPaperShotgun, IGN indie, Eurogamer, niche sim outlets (Sim Update Magazine).

### Risks + fallback

- **Risk: Phase 4 Steamworks integration drags.** Fallback: ship as itch.io build for Phases 5-6, Steam in Phase 7. Itch.io has zero shipping friction.
- **Risk: low wishlist count.** Fallback: delay EA to Q1 2027 rather than launch into a void. Indie-launch playbook: **better to delay than ship un-noticed**.
- **Risk: Phase 6 tactical layer scope-creeps.** Fallback: cut to Phase 9 (post-EA). Don't let it block launch.
- **Risk: Tauri/Steamworks compat.** Fallback: drop Tauri, repackage as Electron or pure web + manual desktop wrap. Tauri is preferred but not load-bearing for Steam.

### Pricing decision (Phase 7)

Pricing is a Phase 7 question, not now. Reference points (set at decision time, not Day 0):

- **911 Operator** ships at $14.99 with frequent sale to $4.99.
- **Door Kickers 2** ships at $19.99 EA, never sales below 30%.
- **This Is the Police** ships at $14.99 with deep sales to $2.99.
- **Global Rescue** EA price (check Steam in October).

Per `feedback_no_monetization_first.md`: don't optimize for revenue, optimize for player satisfaction. EA pricing should sit slightly above 911 Operator to signal depth, slightly below Door Kickers 2 to acknowledge EA. Likely $14.99-$17.99 range. Decide in Phase 7.

## 12. Definition of done — v0.1

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
- [ ] Studio-OS dashboard shows operator-sim card green
