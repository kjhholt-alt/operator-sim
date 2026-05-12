# Operator Sim — Sprint Day 14-21 (the variety unlock)

**Sprint goal:** make the Phase-2 build Steam-page material. Ship save/replay,
the full QC bbox bake, the police agency, multi-shift career arc, and the
Steam coming-soon copy in a single ~1-week megasprint.

**Calendar:** opened 2026-05-11. Sprint scope was Day 14 → Day 21 of the
8-phase road to Steam EA on 2026-12-31.

**Mode:** /megasprint autonomous — Producer + Implementer A/B + Designer +
QA + Reviewer + CI roles ran with zero touchpoint interruptions.

---

## SHIPPED

| # | Feature | Commit | Why it matters |
|---|---------|--------|----------------|
| 1 | K9-1 + S1 SWAT in roster (8 units / 12 personnel / 2 stations) | `51b2a5f` | Day 13 agency-filter promised police-side classes the roster never staffed. Closed. |
| 2 | Floor snapshot serializer + Dexie save/load helpers | `9821bd7` | `serializeFloor` / `applySnapshot` round-trip every entity map, set, and history. Road graph is preserved across load (immutable bake — no need to round-trip ~21 MB). |
| 3 | `save` / `replay` / `forget` palette verbs | `5fbdb25` | New slot kinds: `freeform` (consumes all trailing tokens — used by `save <name>`) and `save` (autocompletes from cached slots). Replay restores the floor without rebuilding the road graph. |
| 4 | `SavesPanel` lobby section | `2cc16c9` | Click-to-replay + click-to-forget. Mirrors the verb path through `executeInput` so both code paths converge. |
| 5 | Police-led shift YAML (`qc_police_001`) | `547f7d1` | Tier 2 Brady-Street pattern. Apex (`i_p05`) requires `patrol + k9 + swat_armored + ambulance_als` simultaneously — first real workout for the Day-13 multi-class machinery. |
| 6 | Career-progress Dexie singleton + `computeUnlockedShifts` | `62acf7b` | Dexie version bumped to 2 (additive `progress` table). Pure gating logic; subscription wires `running → complete` to the persist call. |
| 7 | ShiftLobby locked/unlocked gating + start-verb wall | `f2665b5` | Locked rows render at 50% opacity with a "locked" label in place of the start arrow; typing `start <id>` for a locked shift hits the same rejection so there's no UI bypass. |
| 8 | Tile-and-merge Overpass scraper (`--tiles NxM`) | `ed6726d` | Splits any bbox into N×M tiles, fetches with backoff, deduplicates by OSM way/node id. Self-checked: 3×3 grid over the full QC bbox partitions exactly, no overlap or gap. |
| 9 | Full QC bbox bake (3×3 tile scrape) | `41a3b4e` | Re-baked `public/data/quad_cities/`. Roads: 26,478. Buildings: 39,274. Addresses: 270 (was 43). validate:shifts still 4/4 green against the wider address list. |
| 10 | Steam coming-soon copy | `af5718f` | `docs/steam/coming-soon.md` — tagline, 296-char short desc, long desc, 7 feature bullets, 20 tags, Tauri sysreqs, full EA disclosure, designer QA checklist that bars cartoon language. |
| 11 | Steam capsule design prompts (P7-*) | `af5718f` | `docs/steam/capsule-prompt.md` — claude.ai/design prompts for main capsule, small, header, library hero, library logo. Plus P7-screenshots and P7-trailer outlines. Each carries the project's color tokens + type stack. |

## VERIFIED

```
$ npm run validate:shifts
[validate-shifts] ✓ 4 shift(s) valid

$ npx vitest run
Test Files  10 passed (10)
     Tests  138 passed (138)
  Duration  ~5s

$ npm run lint   # tsc --noEmit
(clean)
```

Test progression across the sprint:

| Stage | Tests | Suites |
|-------|-------|--------|
| Day 13 baseline | 113 | 8 |
| + K9/SWAT roster (no new tests, defensive run) | 113 | 8 |
| + snapshot serializer (`persist.test.ts`) | 121 | 9 |
| + save/replay verbs (`verbs.test.ts` +7) | 128 | 9 |
| + SavesPanel + police shift (no new tests, defensive run) | 128 | 9 |
| + career persistence (`career.test.ts`) | 135 | 10 |
| + lobby gating (`lobby.test.ts` +3) | **138** | 10 |

## BLOCKED

Nothing. Single hiccup during the sprint: Overpass returned 504 on the
tile-7 address query, which the scraper recovered from on retry. No code
changes needed.

## NEEDS KRUZ

Nothing blocking. Two soft touchpoints staged for Day 16+ if Kruz wants them:

- **Touchpoint #2 (mid-Phase-2 feel check)** — "Tier 2 + police lane: does
  the dispatch loop sing at this scale, or does the QC bake make the
  dossier search feel sluggish?"
- **Touchpoint #3 (hi-fi mockup review)** — "Render the P7-main capsule via
  claude.ai/design and rate the typographic confidence vs the live
  TopStrip."

Both can sit until Kruz wants to open them. Touchpoint #1 ("Does it feel
like Operator Sim?") from Day 7 is still open — Day 14 ships variety so
the answer has more surface to test.

## NEXT MOVE

Day 15-21 stays in the variety lane. Top of the Day-22+ menu:

1. **Dossier search pagination** — 39,274 buildings means the LeftRail's
   address dossier search needs to virtualise. `@tanstack/react-virtual`
   is already a dep; wire it up.
2. **Tier-3 narrative cascade** — make the i_p04 cardiac in
   `qc_police_001` block staffing the i_p05 apex (so the player has to
   commit M1 *before* the warrant escalates). Tests the dispatch FSM at
   the narrative-thread level.
3. **Steam page render through claude.ai/design** — run P7-main, P7-small,
   P7-logo, drop exports under `docs/steam/assets/`, then iterate.
4. **Map view scale-out** — the iso city render currently centres on
   downtown Davenport. With the wider bake, sub-quadrant centring (e.g.
   downtown Rock Island, downtown Moline) becomes a meaningful selection
   instead of a re-centre.

## Sprint metadata

- **Commits:** 11 (`51b2a5f`, `9821bd7`, `5fbdb25`, `2cc16c9`, `547f7d1`,
  `62acf7b`, `f2665b5`, `ed6726d`, `41a3b4e`, `af5718f`, plus this wrap).
- **Files touched:** ~20 (3 new src files, 1 new YAML, 2 new docs, 1 new
  test suite, plus existing src/state, src/sim, src/components edits).
- **Bake delta:** roads ×~50, buildings ×~25, addresses ×~6. `public/data/`
  is now 21 MB — large for a repo, but committed because the EA build
  ships it.
- **Touchpoints used in sprint:** 0 of the 2 budgeted. Both remain
  available for Day 16+.
