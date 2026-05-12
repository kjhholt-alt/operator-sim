# Operator Sim — STATUS

> Updated by Producer agent every 30 min during active sprints. This file IS the truth.

**Last updated:** 2026-05-11 — Day 14 sprint shipped (variety unlock)
**Phase:** Day 0–14 ✅ · Phase 2 (variety) — save/replay, full QC bake, police agency v1, career gating, Steam page drafted
**Build:** v0.0.14-day14 (master) · `feat/war-smoke` branch carries Day 12.5 (not merged)
**Repo:** [github.com/kjhholt-alt/operator-sim](https://github.com/kjhholt-alt/operator-sim)
**End-of-year goal:** Steam Early Access launch by 2026-12-31. See `docs/GDD.md` § 11 for the 8-phase roadmap.
**CI:** workflows green; `npm run validate:shifts` covers 4 shifts (3 tiers + police lane).
**Open touchpoint:** **Touchpoint #1 — "Does it feel like Operator Sim?"** Posted to `#claude-chat`. Day 14 ships variety so the touchpoint answer has more surface to test.
**Blockers:** none

---

## What's playable today

```
Boot → 3 units staged at Davenport Central, Tier-1 shift armed (5 incidents over 12 game-min).
Press Ctrl+K → palette → type "dis" → Tab → "dispatch " → Tab → top-suggested available unit
→ Tab → top-suggested active incident → Enter. Unit routes on real OSM roads, dwells on scene
for the resolution window, returns home. New incidents flow into the queue at scheduled times.
At T+12:00 the win/loss summary lands with an S/A/B/C/D grade.
```

- 1× speed: ~48 real seconds for a full shift.
- 4× speed: ~12 real seconds.
- Pause toggle / 0.5×/1×/2×/4× speed picker on TopStrip.

## Done — Day 0 → Day 7

| Day | What shipped | Tests | Commit |
|-----|--------------|-------|--------|
| 0 | Repo scaffold · Vite/React/Tailwind/Tauri · Palantir tokens · CI workflows · 5 research dossiers | 5 | (Day 0 chain) |
| 1 | Zod ontology · MapLibre live · Overpass scrape script · validate-shifts.mjs · zustand floor store | 5 | (rolled into Day 0) |
| 2 | Baked OSM data · LeftRail wired · RightRail dossier · CommandPalette skeleton | 5 | (early Day 2) |
| 3 | Road graph + Dijkstra + walkAlong · dispatch FSM · tick loop @ 4 real-sec/game-min · PathLayer | 13 | (Day 3 commit) |
| 4 | Selection history (browser-style nav) · clickable map units/incidents · richer dossiers | 22 | (Day 4 commit) |
| 5 | Verb registry + typed slots · Tab-completion · context-aware suggestions · 8 verbs | 45 | `91667c6` |
| 6 | First real shift YAML · Zod-validated loader · spawn timeline · win/loss summary modal | 58 | `d4d228a` |
| 7 | Live Shift HUD · defensive loadShift · 7 edge-case tests · STATUS rewrite · touchpoint #1 | 65 | `36a8c54` |
| 8 | Multi-unit incidents (`required_units`) · Tier 2 shift YAML · 4-class roster (engine/ladder/ambulance/patrol) · per-incident dwell-start gate · dossier requirement chip · 4 multi-unit tests | 69 | `540a7b3` |
| 9 | ShiftLobby panel · `start`/`restart`/`end_shift`/`lobby` verbs · `shift` slot kind in palette · returnToLobby resets roster to homebases · ShiftSummary footer adds Restart + Return-to-Lobby · 12 lobby tests | 81 | `341cc90` |
| 10 | 2nd station (Davenport East) · roster grew 4→6 units · `assign <incident>` verb auto-picks closest available units per required class · `pickClosestAvailable` haversine helper · 12 closest-unit tests | 93 | `0b3df49` |
| 11 | Tier 3 shift YAML (`qc_tier3_001`, 18 min, 9 incidents, 3 narrative arcs) · `activeNarrativeArcs` helper · ShiftHUD now shows live arc chips (violet) for in-flight storylines · 8 thread/Tier-3 tests | 101 | `7fbe3b7` |
| 12 | Watchfloor design ported (claude.ai/design v1+v2) — scrolling tagged BottomTicker · CenterOverlays (Incident Queue + Shift Rundown + sparkline) · LeftRail accent-cyan active bar · RightRail bordered KIND/depth chip · TopStrip vrule layout · 2.5D isometric city view + day/night cycle + MAP/CITY toggle (`view_mode` in floor store) · live entities project from address bbox onto iso grid · `iso-ripple` keyframe | 101 | `5f613a8` |
| 13 | Agency filtering on `assign` (16-incident-type compatibility table; `medical_*` only pulls ambulances, `police_*` only pulls patrol/k9/swat_armored, `fire_*` only pulls engine/ladder/rescue/tanker/brush/command) · station markers on MapLibre (cyan square ScatterplotLayer, click→dossier) · per-incident response lines on both views (cyan PathLayer on MapLibre, dashed iso lines on the city view, brighter when on_scene) · 12 new agency-filter tests | 113 | `d1cd355` |
| 14 | Day-14-to-21 sprint (variety unlock) — K9-1 + S1 SWAT join roster (8 units/12 personnel) · floor snapshot serializer + Dexie save/load · `save`/`replay`/`forget` palette verbs with `freeform` + `save` slot kinds · `SavesPanel` in ShiftLobby · `qc_police_001` shift (Brady-Street pattern apex requires patrol+k9+swat+ambulance simultaneously) · career-progress Dexie singleton + `computeUnlockedShifts` gating + lobby locked rows + start-verb wall · tile-and-merge Overpass scrape (3x3 over full QC bbox) · re-baked 26,478 roads / 39,274 buildings / 270 addresses · Steam coming-soon copy + claude.ai/design P7-* capsule prompts | **138** | `51b2a5f`-`af5718f` |

## 138/138 tests · `tsc --noEmit` clean

| Test file | Tests | Covers |
|-----------|-------|--------|
| `src/sim/shift.test.ts` | **20** | YAML parse, spawn timeline (no-op / fires at due / idempotent / address-miss / case-insensitive / high-speed jump / boundary), outcome scoring (S/A/B/C/D, late_by, boundary, cancelled, on-scene-at-end, B-grade boundary, defensive loadShift) |
| `src/sim/verbs.test.ts` | 23 | parser, suggestForInput, applySuggestion, executeInput |
| `src/state/nav.test.ts` | 9 | back/forward stacks |
| `src/sim/dispatch.test.ts` | 4 | full FSM cycle on synthetic graph |
| `src/sim/pathfinding.test.ts` | 4 | Dijkstra + walkAlong |
| `src/lib/schemas.test.ts` | 5 | Zod ontology |

## What lives on disk

- **Roster** (`src/state/seed.ts`) — Davenport Central station, 3 units (E1, M2, 234), 4 personnel.
- **Shift** (`data/shifts/qc_tier1_001.yaml`) — 12 game-min, 5 incidents (false alarm → diabetic → MVA → cardiac → tree on road). Validator-clean. Bundled at build time via Vite `?raw`.
- **Map data** (`public/data/quad_cities/{roads.geojson,buildings.geojson,addresses.json}`) — 43 baked addresses, road graph for downtown Davenport.

## Open touchpoint — #1, "Does it feel like Operator Sim?"

Producer should answer:

1. **Pacing** — does Tier 1 at 1× speed feel deliberate or boring? At 4× speed do you lose track?
2. **The Shift HUD** (`ShiftHUD.tsx` in TopStrip) — does the 5-block spawn meter + on-time counter + draining time bar give you a useful read on the shift?
3. **End-of-shift summary** — is the grade chip (S/A/B/C/D) + per-incident table the right resolution at this stage, or do we need a debrief screen?
4. **Palette discoverability** — Ctrl+K reveals everything, but a brand-new player wouldn't know that. Do we need an opening tutorial pop-up, or is "Ctrl+K" in the BottomTicker enough?
5. **Should Tier 1 introduce all 5 incident types (alarm / med-general / MVA / cardiac / service)?** — or front-load with one type so the player learns the loop before variety lands?

## Day 8+ (Phase 2 — variety) — STATUS AT END OF DAY 14

Per `docs/GDD.md` § 11.2, "playable Tier 1" is done. Phase-2 lane checklist:

- [x] **2nd shift** at Tier 2 difficulty (`qc_tier2_001`, Day 8)
- [x] **Multi-unit incidents** (`expected_units` → `required_units`, Day 8)
- [x] **Police agency** v1 (`patrol`, `k9`, `swat_armored` units + `qc_police_001` shift, Day 14)
- [x] **Map quadrant tile-and-merge** (Overpass 3x3 over full QC bbox, Day 14)
- [x] **Save/replay verbs** (palette → `save <name>` / `replay <id>` / `forget <id>`, Day 14)
- [x] **Career progression** (Dexie-backed `completed_shift_ids`, lobby locked rows, Day 14)
- [x] **Steam page de-risk** (coming-soon copy + P7-* capsule prompts, Day 14)
- [ ] **Hi-fi mockup loop on claude.ai/design** (touchpoint #3 — open in Day 16+)

## Day 15+ menu (the lane stays variety until Phase 3 alpha)

- Tier-3 polish pass once the new bake exposes new dispatch corner cases
- Dossier search pagination for the new 39,274-building dataset
- Mid-shift cardiac → SWAT chaining (narrative thread requiring the player to
  resolve i_p04 cardiac before being able to staff the i_p05 apex)
- Career-reset verb + a "career" panel surface in the lobby footer
- Capsule art render through claude.ai/design (touchpoint #3)

## Touchpoint budget

| # | When | Question | Status |
|---|------|----------|--------|
| 1 | End Wk1 | Does it feel like Operator Sim? | **OPEN** — Day 7 ship is the touchpoint |
| 2 | Mid Wk2 | Mid-week feel check | unspent |
| 3 | End Wk3 | hi-fi mockup review | unspent |
| 4 | End Wk4 | ship or extend? | unspent |
