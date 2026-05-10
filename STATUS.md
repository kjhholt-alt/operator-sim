# Operator Sim — STATUS

> Updated by Producer agent every 30 min during active sprints. This file IS the truth.

**Last updated:** 2026-05-09 — end of Day 9 autonomous run · Phase 2 in flight
**Phase:** Day 0–9 ✅ · Phase 2 (variety) — multi-unit + lobby/shift-picker shipped
**Build:** v0.0.9-day9
**Repo:** [github.com/kjhholt-alt/operator-sim](https://github.com/kjhholt-alt/operator-sim)
**End-of-year goal:** Steam Early Access launch by 2026-12-31. See `docs/GDD.md` § 11 for the 8-phase roadmap.
**CI:** workflows green; `npm run validate:shifts` runs against the shipped Tier-1 YAML.
**Open touchpoint:** **Touchpoint #1 — "Does it feel like Operator Sim?"** Posted to `#claude-chat`.
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
| 9 | ShiftLobby panel · `start`/`restart`/`end_shift`/`lobby` verbs · `shift` slot kind in palette · returnToLobby resets roster to homebases · ShiftSummary footer adds Restart + Return-to-Lobby · 12 lobby tests | **81** | (this commit) |

## 65/65 tests · `tsc --noEmit` clean · `vite build` 13s · 1.86 MB / 531 KB gzipped

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

## Day 8+ (Phase 2 — variety)

Per `docs/GDD.md` § 11.2, "playable Tier 1" is now done. Phase 2 introduces:
- **2nd shift** at Tier 2 difficulty (denser pacing, harder address mix)
- **Multi-unit incidents** (`expected_units` becomes load-bearing — engine + ambulance for MVAs)
- **Police agency** (`patrol`, `k9`, dispatch routing by agency)
- **Map quadrant tile-and-merge** (Overpass scrape full QC bbox)
- **Save/replay verbs** (palette → `save shift_qc_001`, `replay shift_qc_001`)

## Touchpoint budget

| # | When | Question | Status |
|---|------|----------|--------|
| 1 | End Wk1 | Does it feel like Operator Sim? | **OPEN** — Day 7 ship is the touchpoint |
| 2 | Mid Wk2 | Mid-week feel check | unspent |
| 3 | End Wk3 | hi-fi mockup review | unspent |
| 4 | End Wk4 | ship or extend? | unspent |
