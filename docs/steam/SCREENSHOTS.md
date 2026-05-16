# Operator Sim — Steam Screenshot Shot List

**Status:** Day 14 draft (Phase 2). 8 required shots + 2 bench shots.
Goal: paste-able Steamworks asset list when the appid lands in Phase 4.

> **Aesthetic floor.** Every shot is in-engine, at native 1920×1080 (the
> minimum Steam main-capsule slot). No external UI overlays, no fake
> mockups, no marketing-only chrome. If a shot needs something that
> doesn't ship by Phase 4, it doesn't go on the page.

> **Tone.** Foundry/Maven dark, dense, observational. No motion blur,
> no cinematic letterboxing. Real text in the panels.

---

## Required (8 — Steam shows the first 4 above the fold)

### 1. The floor at rest (default state, no incidents)
- City: Quad Cities Davenport tile, daytime.
- Visible: full ontology panel (left), 3 staged units on map, intel
  feed on right, command palette closed.
- Why: anchors the player in "this is what every shift starts as."

### 2. Command palette open mid-dispatch
- `Ctrl+K` focused on `dispatch E1 to incident #4`.
- Visible: active incident pulse on map, autocomplete matches with
  unit availability + ETA.
- Why: shows the differentiator — keyboard-first verbs.

### 3. Multi-agency response (the chaos moment)
- One MCI-class incident, 4+ units en route (fire, EMS, police).
- Visible: unit status colors, ETA badges, radio scrollback ticking.
- Why: proves the breadth without overselling.

### 4. Drill-down on an incident entity
- Incident detail panel: classification, caller transcript snippet,
  linked entities (address, prior incidents at same address,
  involved parties).
- Why: Palantir/Foundry comparison made literal.

---

### 5. Shift briefing (DM-generated)
- Pre-shift screen: 2-paragraph narrative briefing + 2-3 open threads
  from prior shifts ("Tuesday's domestic dispute, status: open").
- Why: shows the narrative campaign mode without spoiling it.

### 6. After-Action Report (post-shift)
- Per-shift summary: incidents resolved, response-time histogram,
  XP gains by category, narrative beats hit.
- Why: gives lovers-of-spreadsheets something to anchor on.

### 7. Difficulty selector + tier comparison
- Pre-shift modal: 5 tiers (briefing-only → MCI-only) with one-line
  descriptions. Calm tier highlighted as default.
- Why: undercuts the "is this a stressful game" worry.

### 8. The intel graph (linked-entities view)
- Zoomed-out view of the entity graph: incidents → addresses →
  involved parties → prior incidents. Real Foundry/Maven aesthetic.
- Why: the wide moat. Nothing else looks like this.

---

## Bench (capture but do not publish until validated)

### B1. Custom-city import flow
- Hold until Phase 4 (custom-OSM importer is on the Phase 3 line).

### B2. SWAT callout
- Hold until the police agency v1 ships (Phase 2 backlog).

---

## Aspect ratios + sizes (Steam canonical)

| Slot                | Pixels        | Notes                                  |
|---------------------|---------------|----------------------------------------|
| Main capsule        | 616 × 353     | text-readable at thumbnail scale       |
| Small capsule       | 462 × 174     | NO body text in the art                |
| Header              | 460 × 215     | hover preview                          |
| Library hero        | 3840 × 1240   | letterbox-safe; menu chrome will pad   |
| Library logo        | 1280 × 720    | transparent PNG, no background         |
| Screenshots         | 1920 × 1080   | min 6, max 12 published                |
| Coming-soon banner  | 1920 × 622    | required for the wishlist page         |

## QA before upload

- [ ] All 8 required shots captured at 1920×1080 PNG, sRGB.
- [ ] No real names, no profanity in any visible text panel.
- [ ] No cartoon icons -- glyphs/typography only.
- [ ] First 4 shots tell the whole pitch with sound off (most Steam
      browsers preview muted).
- [ ] Match the long-description claims one-to-one. If a feature
      isn't in a shot, cut it from the copy too.

## Capture workflow

1. Run the live build (`npm run dev`) on a calm shift.
2. Hide the dev-only HUD overlays (key combo TBD; current build has
   none, so just F11 for fullscreen).
3. Windows: `Win+Shift+S` → window mode → PNG.
4. Drop in `docs/steam/screenshots/<NN>-<slug>.png`.
5. Update this file with the actual filename next to each shot.
