# Operator Sim — STATUS

> Updated by Producer agent every 30 min during active sprints. This file IS the truth.

**Last updated:** 2026-05-09 — end of Day 0 autonomous run
**Phase:** Day 0 complete · Day 1 research complete · Day 2 prep complete
**Build:** v0.0.1-day0
**Title:** Operator Sim — locked. (Renamed from "Watchfloor" placeholder 2026-05-09 evening.)
**Repo:** [github.com/kjhholt-alt/operator-sim](https://github.com/kjhholt-alt/operator-sim)
**End-of-year goal:** Steam Early Access launch by 2026-12-31. See `docs/GDD.md` § 11 for the 8-phase roadmap.
**CI:** workflows wired, will run on first PR
**Open touchpoint:** none — autonomous
**Blockers:** none

**API keys:**
- ✅ Firecrawl (`fc-d6c9b3f0fbb344c08ea5a3a94b164cf4`) — saved to `.env` (gitignored). Researcher unblocked for next reference scrape.
- ✅ Discord webhook — saved to `.env`.

---

## Done (Day 0 autonomous run, 2026-05-09)

### Scaffold
- Repo at `kjhholt-alt/operator-sim` (public). Vite + React 19 + Tailwind 4 + Tauri 2.
- Shell components: TopStrip, LeftRail, CenterMap (with live MapLibre), RightRail, BottomTicker, CommandPalette.
- Palantir tokens locked in `src/index.css` (matches `feedback_design_palantir.md`).
- JetBrains Mono + IBM Plex Sans fonts.
- Build green: tsc clean, vite 4.8s, 5/5 vitest tests passing.

### Day 1 work pre-shipped
- `src/lib/schemas.ts` — Zod schemas for all 8 entity kinds + Shift document.
- `src/state/useFloor.ts` — zustand store (time, selection, camera, working set, event log).
- `src/state/db.ts` — Dexie schema for IndexedDB persistence.
- `src/components/map/Map.tsx` — MapLibre boots OpenFreeMap Liberty tiles, syncs camera to floor store.
- `scripts/scrape-overpass.mjs` — bake Quad Cities (or any bbox) roads/buildings/addresses.
- `scripts/validate-shifts.mjs` — CI sanity gate for Designer's shift YAML.
- `vitest.config.ts` — jsdom env, alias.

### Research dossiers (5 files, ~9,500 words total)
- `docs/research/foundry-ui.md` (~1,900 words, 19 sources) — layout, palette, type, components, motion, density. Confirms our locked tokens are on-spec, slightly cooler-blue (Anduril/Maven-leaning, good).
- `docs/research/dispatch-domain.md` (~2,400 words, 22 sources) — NFIRS taxonomy, NERIS replacement note (Jan 2026), unit FSM with 10-codes, NFPA 1710 thresholds, real call-pacing data, 10 design recommendations.
- `docs/research/game-references.md` (~2,150 words, 18 sources) — 6 games triangulated. Door Kickers 2's NATO-overlay aesthetic + This Is the Police's narrative ambition + Global Rescue's real-OSM = our wedge. Open-seat thesis defended.
- `docs/research/osm-data.md` (~2,100 words, 22 sources) — OpenFreeMap Liberty + MapLibre + deck.gl + turf-A* for v0.1; PMTiles slice for v0.2 independence. 10-step Day-2 checklist.
- `docs/research/narrative-shift-design.md` (~3,050 words) — RPG fronts/clocks → game shifts. 9-1-1 + Third Watch as TV reference, not The Wire. 8 threadable items. Copy-paste shift-DM prompt scaffold + 30-shift seed plan.

### Tooling
- 7-role agent layout under `agents/{producer,researcher,designer,impl-map,impl-ui,qa,reviewer}/`.
- New `/dispatchaudit` skill at `~/.claude/skills/dispatchaudit/SKILL.md`.
- 3 GitHub Actions workflows: `ci.yml`, `tauri.yml`, `dispatchaudit.yml`.
- Studio-OS registered (`~/.operator/studio/studio.toml`); `scripts/emit-status.mjs` lives.
- `docs/CLAUDE_DESIGN_PROMPTS.md` — pre-built prompts for claude.ai/design (6 panels + iteration prompts).
- Project memory saved (`project_operator-sim.md`, `reference_claude_design.md`, MEMORY.md updated).

### Discord
- Kickoff posted to `#claude-chat`.
- Day 0 checkpoint posted with repo URL.
- Final report posted on autonomous-run wrap.

## Day 1 (when Kruz wakes / picks back up)

The Researcher dossiers are done — Day 1's "research phase" is shipped a day early. Day 1 collapses into:

- Designer: digest dossiers, write `agents/designer/prompts/shift-dm.md` from the scaffold in `narrative-shift-design.md`. Generate first 5 seed shifts. Run `npm run validate:shifts`.
- Implementer A: run `npm run scrape:overpass` once for QC. Wire baked data into `useFloor` stores. Make MapLibre dark-restyle work.
- Implementer B: wire LeftRail to count from `useFloor.units / incidents / etc`. Real entity-row click → `floor.select(...)` → RightRail dossier reads from `getEntity(...)`.
- QA: `/webexplore smoke` against the dev server.

## Day 2-7

Per `docs/GDD.md` § 9. Day 2 = OSM tiles + 1 unit moves on real roads. Day 7 = Tier-1 fully playable + Discord touchpoint #1.

## Open questions for Kruz

1. **Title.** Operator Sim placeholder OK, or rename now? Easy to rename — `gh repo rename` + commit.
2. **Firecrawl API key.** Researcher worked from cached knowledge today. Future research passes (Steam-page screenshot scraping, deeper Foundry references) would benefit from a real key. Get one at https://firecrawl.dev (free tier).
3. **Cities.** Default = Quad Cities. Want a 2nd-city pre-bake (Iowa City? someplace bigger like Chicago for ambition?) or stay focused on QC for v0.1?

## Touchpoint budget

| # | When | Question | Status |
|---|---|---|---|
| 1 | End Wk1 | Does it feel like Operator Sim? | unspent |
| 2 | Mid Wk2 | Mid-week feel check | unspent |
| 3 | End Wk3 | hi-fi mockup review | unspent |
| 4 | End Wk4 | ship or extend? | unspent |
