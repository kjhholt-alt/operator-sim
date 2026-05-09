---
summary: Palantir Foundry / Maven / Gotham share a restrained, near-monochrome, dense desktop aesthetic — left rail of entities, center workspace (map or graph), right dossier, with Blueprint design system colors and an F-shape information hierarchy. Watchfloor should mirror these patterns at the layout, color, typography, and motion levels rather than copy individual screens.
actionable_for: [implementer-b, designer]
sources: 19
written: 2026-05-09
---

# Foundry-grade UI dossier — for Watchfloor

## 1. Layout grid

The Palantir / Anduril operator-workstation lineage converges on a four-zone desktop layout. Most public references describe variants of:

| Zone | Contents | Notes |
|---|---|---|
| **Top status strip** | App identity, global search, primary tabs, alert/toast surface | Palantir Workshop pins navigation: "Ensure your navigation bars and tabs are part of your primary header so that only sections that contain content in your application are sections that users can scroll" [(Foundry app design best practices)](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices) |
| **Left rail** | Entity / asset list, navigation, multi-select | Anduril Lattice: "operators can open their environment's Lattice UI and choose entities from the **Assets panel on the left hand side**" [(Anduril Lattice docs)](https://developer.anduril.com/samples/overview). Lauren Park's sanitized Lattice case study confirms a left-rail sidebar with Multi-Select and Starred Panel icons [(Lauren Park / Anduril)](https://www.laurenjpark.com/work/anduril) |
| **Center workspace** | Fused map (Maven), graph canvas (Gotham), or dashboard grid (Foundry) | Maven: "fused map view with feeds from satellites, drones, signals intelligence, and prior map data, all layered together on a globe" [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system). Gotham: "Graph is centered around the Canvas: a visual interface that allows users to display relevant artifacts, entities and links between them" [(Gotham platform overview)](https://www.palantir.com/platforms/gotham) |
| **Right dossier / details** | Selected entity attributes, action bar, history | Lattice: "Object Details panel with action bars" [(Lauren Park / Anduril)](https://www.laurenjpark.com/work/anduril). Gotham Dossier: "users create dynamic intelligence products… drag-and-drop key entities and visualisations" [(Gotham service definition)](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/92736/801146272055049-service-definition-document-2024-11-26-1253.pdf) |
| **Bottom bar (optional)** | Timeline scrubber, action confirmation, snackbar | Gotham: "Timeline panel that facilitates information comparison across different time points" [(Gotham platform overview)](https://www.palantir.com/platforms/gotham). Lattice: "Bottom action bars with primary buttons… Bottom sheet modals" [(Lauren Park)](https://www.laurenjpark.com/work/anduril) |

Density rule from Palantir's own Workshop guide: **maintain 30-40% whitespace, ≤10 visible components per view, ≤5 primary actions in top-level navigation, F-shaped reading hierarchy** [(Foundry app design best practices)](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices). This is the upper bound on density — Bloomberg pushes lower whitespace and crams more screens, but Foundry/Maven sit in this Palantir range.

Aspect ratio: full-bleed desktop (1440-1920 wide), no max-width container. Sidebars are fixed-width. Center scales with viewport.

## 2. Color palette

Palantir's brand-level palette is intentionally austere: **black (#000000), white (#FFFFFF), no brand accent colors** [(DesignYourWay / Palantir logo)](https://www.designyourway.net/blog/palantir-logo/). The product surfaces lean on Blueprint's full token set.

### Blueprint dark grays — the canonical "Foundry charcoal"
Pulled directly from `palantir/blueprint/packages/colors/src/colors.ts` [(Blueprint colors source)](https://github.com/palantir/blueprint/blob/develop/packages/colors/src/colors.ts):

| Token | Hex | Typical role |
|---|---|---|
| `BLACK` | `#111418` | App body background |
| `DARK_GRAY1` | `#1C2127` | Panel background |
| `DARK_GRAY2` | `#252A31` | Elevated panel |
| `DARK_GRAY3` | `#2F343C` | Hover / pressed |
| `DARK_GRAY4` | `#383E47` | Border bright |
| `DARK_GRAY5` | `#404854` | Highest-elevation surface |
| `GRAY1`-`GRAY5` | `#5F6B7C` → `#C5CBD3` | Mute → bright foreground |
| `LIGHT_GRAY1`-`LIGHT_GRAY5` | `#D3D8DE` → `#F6F7F9` | Light-mode surfaces (irrelevant to Watchfloor) |

### Blueprint accent colors (use sparingly)
Each accent has 5 tints (1=darkest, 5=lightest). The middle tint (3) is the canonical hover/active.

| Accent | Tint 3 hex | Semantic meaning in Foundry/Maven |
|---|---|---|
| `BLUE3` | `#2D72D2` | Default selection, primary action |
| `GREEN3` | `#238551` | Success, resolved, safe |
| `ORANGE3` | `#C87619` | Warning, in progress |
| `RED3` | `#CD4246` | Critical, failed, target / hostile |
| `CERULEAN3` / `TURQUOISE3` | live data, live tracking |
| `INDIGO3`, `VIOLET3` | inferred / linked / intel |
| `GOLD3`, `SEPIA3` | metadata / archive |

The Palantir Workshop "Used Colors" feature lets builders save semantic palettes per app and swap them per light/dark mode [(Workshop used colors)](https://www.palantir.com/docs/foundry/workshop/used-colors) — i.e. the platform itself enforces tokens, not raw hex.

### Watchfloor mapping (already locked at `src/index.css`)
Watchfloor's tokens are a tighter, slightly cooler-blue variant of Blueprint dark:

| Watchfloor token | Watchfloor hex | Closest Blueprint analog |
|---|---|---|
| `--color-bg-base` `#080b12` | deeper than `BLACK #111418` |
| `--color-bg-panel` `#0d111c` | between `BLACK` and `DARK_GRAY1` |
| `--color-bg-elev` `#111729` | shifted-blue `DARK_GRAY1` |
| `--color-accent-cyan` `#4ad8e6` | slightly between `CERULEAN5 #68C1EE` and `TURQUOISE5 #7AE1D8` |
| `--color-accent-emerald` `#3fd97f` | brighter than `GREEN4 #32A467` |
| `--color-accent-amber` `#f0b85a` | between `ORANGE4 #EC9A3C` and `GOLD4 #ECB949` |
| `--color-accent-crimson` `#ec5b6b` | between `RED4 #E76A6E` and `ROSE4 #F5498B` |
| `--color-accent-violet` `#a07aff` | between `INDIGO4 #9881F3` and `VIOLET5 #D69FD6` |

Verdict: **Watchfloor is on-spec.** The cyan-leaning palette tracks closer to Anduril/Maven map UIs than to default Foundry-blue.

## 3. Typography

### Font choice
Blueprint defaults to a system stack: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif` — i.e. neutral grotesque, no brand font. The Palantir wordmark itself "resembles a custom or modified geometric grotesque, similar in structure to Neue Haas Grotesk" [(DesignYourWay)](https://www.designyourway.net/blog/palantir-logo/). Bloomberg by contrast commissioned a bespoke Matthew Carter font with finance glyphs (1/64th fractions) [(Bloomberg LP)](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/) — Watchfloor uses IBM Plex Sans + JetBrains Mono, which sits in the same neutral-grotesque + functional-mono space.

### Heading scale (from Blueprint `_typography.scss` [(source)](https://github.com/palantir/blueprint/blob/develop/packages/core/src/_typography.scss))

| Heading | Size / line-height |
|---|---|
| H1 | 36px / 40px |
| H2 | 28px / 32px |
| H3 | 22px / 25px |
| H4 | 18px / 21px |
| H5 | 16px / 19px |
| H6 | 14px / 16px |

Body text: 14px Blueprint default. Watchfloor runs at 13px which is slightly denser — fine.

### Mono vs sans rule
Bloomberg lesson: "Bloomberg expresses information 'in your face' using high contrast colors… speed, dense information display, reliability" [(Bloomberg LP)](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/). The discipline:
- **Sans for prose, labels, headings.** IBM Plex Sans.
- **Mono for any data point that should align in a column.** JetBrains Mono. This includes: timestamps, IDs, coordinates, counts, callsigns, status codes, currency.
- **Numerals always tabular** (`font-feature-settings: "tnum"`). Without this, columns of numbers ragged-align and the "Foundry-grade" feel collapses.

## 4. Component vocabulary

The recurring Foundry/Maven/Gotham/Lattice components, ranked by how essential they are to mirror:

1. **Entity row** — left-rail item with: status dot (4px), monospace ID (small mute), sans label (regular), tiny timestamp or distance metric (mute mono). Rows are 28-32px tall, no rounding except 2-3px on hover.
2. **Dossier card** — right-pane entity detail. Sections: header (label + status badge + actions), key/value attribute grid (mono values), linked-entity strip, history timeline, action bar pinned to bottom. Reference: Gotham Dossier app — "drag-and-drop key entities and visualisations… data inserted retains a dynamic link back to its source" [(Gotham service def PDF)](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/92736/801146272055049-service-definition-document-2024-11-26-1253.pdf).
3. **Ontology graph / link canvas** — node-edge whiteboard for relationships. Gotham's Graph app: "Nodes and links can be quickly rearranged spatially within the canvas to understand a network" [(Gotham platform)](https://www.palantir.com/platforms/gotham). Avoid colored nodes-by-type unless type is meaningful; lean on icon + label.
4. **Command palette / global search** — Cmd+K. Gotham: "built like an internet search engine, with a home screen displaying prominently a search bar" [(Gotham operator workstation)](https://www.palantir.com/platforms/gotham).
5. **KPI strip** — horizontal row of 4-8 metric tiles at top of workspace. Each tile: label (mute mono uppercase), big value (sans bold), delta (mono with cyan/crimson), tiny sparkline (no axis). Heights ~64-72px.
6. **Sparkline** — inline 1px stroke, 24-40px tall, no axis, no labels. Cyan when live, mute gray when historical.
7. **Tabular table** — striped rows are out; instead use 1px subtle borders. Right-align numeric columns. First column locks on horizontal scroll. No vertical column borders.
8. **Status dot + badge** — 4px dot for inline rows, 6-8px for dossier headers. Badge variants: live (cyan, possibly pulsing), success (emerald), warn (amber), critical (crimson), inferred (violet outline only). Avoid filled gray badges — use mute text instead.
9. **Timeline strip** — bottom-pinned, time-scrubbable. Gotham: "Timeline panel that facilitates information comparison across different time points" [(Gotham platform)](https://www.palantir.com/platforms/gotham). Marks: thin vertical ticks at events, hover for detail popover.
10. **Histogram tool** — Gotham: "a chart that looks like a web and makes connections between things… correlations and trends" [(Vice / Palantir manual leak)](https://www.vice.com/en/article/revealed-this-is-palantirs-top-secret-user-manual-for-cops/). Watchfloor variant: a frequency-band view of incident types over time.
11. **Kanban / process columns** — Maven uses these explicitly. From the AIPCon demo description: "a literal Kanban board — like a task tracker, but with vertical columns representing the different processes" [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system).
12. **Toast / snackbar** — top or bottom-pinned, monochrome surface with single accent stripe (cyan, amber, crimson). 4-6 second auto-dismiss. No drop shadow — use border + slight elevation tone.

## 5. Motion + interactivity

Restraint is the rule. Foundry's design philosophy emphasizes precision over personality with grid-heavy layouts [(DesignYourWay)](https://www.designyourway.net/blog/palantir-logo/). Specifics:

- **Hover states**: background-only, 80-120ms ease. No translate, no scale.
- **Selection**: 1px accent-cyan border on the side facing the viewer (left rail = right border, dossier = left border). Persistent, not animated in.
- **Transitions**: cross-fade at 150-180ms when swapping detail panels. Slide-in for new panes from the right at 200ms ease-out.
- **Pulses**: only for "live" status. Subtle 2px halo, 1.5s loop, 0.4 → 0.7 opacity, no scale.
- **No bounce, no spring, no parallax, no reveal-on-scroll.** Foundry-grade UIs treat motion as feedback, not delight.
- **Keyboard-first**: Bloomberg lesson — "design choices that reduce time-to-action, increase information per screen, and favor keyboard control" [(Bloomberg LP)](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/). Cmd+K palette, j/k to walk entity list, Enter to open, Esc to close.

## 6. Information hierarchy

What "dense" actually means, calibrated:

- **Datapoints visible above the fold**: Palantir Workshop says ≤10 components per view [(best practices)](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices), but each component can hold 10-30 data fields. Realistic Foundry dashboard: **40-80 datapoints visible without scrolling** (KPI strip 6 metrics × 3 fields each = 18, entity list 12 rows × 3 fields = 36, dossier card 8 attributes = 8, total ~62). Bloomberg pushes to 200+; that's the upper bound and not Watchfloor's target.
- **F-shape reading**: top strip first (status), then left rail (browse), then center (work), then right (detail). [(Foundry best practices)](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices)
- **Whitespace 30-40%**, applied as 8-16px gutters, not center-of-card padding.
- **No more than 5 primary actions per view.** [(same source)](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices)
- **Spacing scale**: Workshop "Compact padding" = 80% height/width with 16px spacing as the base. Watchfloor should run on a 4 / 8 / 12 / 16 / 24 grid.

## 7. What they avoid

Negative space — the things Foundry-grade UIs do *not* do — is just as load-bearing as what they include:

- **No gradients.** Backgrounds are flat solid fills. The only acceptable gradient is a 1-stop alpha fade for map vignette or chart fill at <15% opacity.
- **No drop shadows.** Elevation is signaled by a +2-4% lighter background tone, not by a shadow. Workshop guide: "use a drop shadow… sparingly" [(Foundry best practices)](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices) — i.e. essentially never.
- **No rounded corners >4px.** Buttons and cards radius 2-4px max. Pills / badges can be fully rounded but only at 12-16px height where it reads as a token, not a pebble.
- **No illustrations, no mascots, no marketing-hero imagery.** Empty states are text + a small icon, never an SVG character.
- **No emoji as data.** Status uses dots and badges, not 🔴🟢.
- **No blurred backdrops, no glassmorphism.** Backdrop-filter is reserved for modal scrim only.
- **No multi-color brand accents on chrome.** Cyan-only for selection. Reserve emerald/amber/crimson/violet strictly for data semantics.
- **No bouncy springs, no Framer hero animations.** [(Anduril & Palantir style emphasizes "machine speed" — bounce reads as toy.)](https://www.anduril.com/lattice/command-and-control)
- **No icon-only buttons without tooltip + accessible label.** Density is fine; mystery-meat is not.
- **No serif fonts.** Anywhere.

## 8. Maven-specific patterns

Maven Smart System (MSS) layers on top of the Foundry/Gotham vocabulary but adds a C2 / target-tracking workflow that distinguishes it from Foundry's data-analyst use case. Cited from the 2025-2026 NATO and AIPCon 9 demos:

- **Fused map as primary surface.** Not a tab — *the* canvas. "Single visualization tool, where users can select and deselect different types of data" [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system).
- **Stable identifier numbers follow targets across modalities.** A detection picked up on satellite, then drone, then SIGINT carries the same ID. UI implication: every entity has a stable mono-formatted ID badge that's globally searchable [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system).
- **Dot density on map.** "At ground-level resolution, the map populates with dots from computer vision detections" [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system). Dots are tiny (3-4px), colored by classification (red = hostile, etc.), aggregating into clusters at lower zoom.
- **Course-of-action / Kanban columns.** "Vertical columns representing the different processes" — i.e. a workflow Kanban exists *alongside* the map, not behind a tab. Users move detections through identification → COA → action [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system).
- **Three-click action.** "Left click, right click, left click. Magically, it becomes a detection." Watchfloor takeaway: every primary action — assigning a unit to a call, escalating, closing — should be ≤3 clicks from the map [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system).
- **Consolidated panes, not tabbed apps.** Maven replaces "eight or nine systems" with one screen. "We've gone from identifying the target to now coming up with a course of action, to now actioning that target, all from one system" — Cameron Stanley, AIPCon 9 [(WinBuzzer)](https://winbuzzer.com/2026/03/16/palantir-demos-military-ai-war-plans-xcxwbn/) [(DefenseScoop)](https://defensescoop.com/2025/05/23/dod-palantir-maven-smart-system-contract-increase/).
- **Toggle-able data layers.** Sat / drone / SIGINT / road network / prior-map are independent layers with checkboxes in a corner control. Users compose their own view [(Spatial Intelligence)](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system).

## 9. Direct copy guidance for Watchfloor — the "if you do nothing else, do these 10 things" list

Reference our locked tokens at `src/index.css`. These are Implementer-facing.

1. **Lock the four-zone grid early.** Top status strip (40-48px), left entity rail (260-320px), center workspace (flex), right dossier (320-400px), bottom timeline (optional, 56-72px). Never let anything float outside these zones.
2. **Use `--color-bg-base` for body, `--color-bg-panel` for the four panels, `--color-bg-elev` only inside cards/modals.** Three-tone elevation, no shadows.
3. **All numeric data — IDs, timestamps, coordinates, counts — uses `var(--font-mono)` with `font-feature-settings: "tnum"`.** Sans for prose only.
4. **Selection = 1px `--color-accent-cyan` left-or-right edge border, no background fill.** Hover = `--color-bg-hover` only.
5. **Status semantics are locked: cyan = live, emerald = resolved, amber = pending, crimson = critical, violet = inferred.** Pick one per row max. Status dot is 4px inline, 8px in dossier header.
6. **Reserve crimson and emerald for data; never use them on chrome buttons.** Primary buttons are bg-elev with cyan border on hover, not filled.
7. **Cap heading scale at H3 22px in-app.** H1/H2 are for the splash screen only. In dossiers and rails, H4 (18px) is your largest heading.
8. **Build a real Cmd+K palette wired to entity search before building any nav menu.** Maven/Gotham start from search; so should we.
9. **Density target: 40-60 datapoints visible above the fold on a 1440 viewport.** If a pane shows fewer than 6 fields, you're under-utilizing it; if it shows more than 30 in one card, split it.
10. **No motion >200ms, no scale/translate hovers, no drop shadows, no gradients, no rounded corners >4px outside of pills.** This is the single rule the Implementer will be tempted to break first — don't.

## Sources

- [Blueprint colors source — palantir/blueprint/colors.ts](https://github.com/palantir/blueprint/blob/develop/packages/colors/src/colors.ts)
- [Blueprint typography source — palantir/blueprint/_typography.scss](https://github.com/palantir/blueprint/blob/develop/packages/core/src/_typography.scss)
- [Foundry Workshop application design best practices](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices)
- [Foundry Workshop "Used Colors"](https://www.palantir.com/docs/foundry/workshop/used-colors)
- [Foundry Workshop Layouts](https://www.palantir.com/docs/foundry/workshop/concepts-layouts)
- [Palantir Gotham platform overview](https://www.palantir.com/platforms/gotham)
- [Gotham service definition document (UK G-Cloud)](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/92736/801146272055049-service-definition-document-2024-11-26-1253.pdf)
- [Vice — leaked Palantir user manual for cops](https://www.vice.com/en/article/revealed-this-is-palantirs-top-secret-user-manual-for-cops/)
- [Spatial Intelligence — Inside Palantir's Maven Smart System](https://www.spatialintelligence.ai/p/inside-palantirs-maven-smart-system)
- [DefenseScoop — DOD raises Maven contract to >$1B](https://defensescoop.com/2025/05/23/dod-palantir-maven-smart-system-contract-increase/)
- [DefenseScoop — DOD aggressive timeline for MSS transition (2026-04)](https://defensescoop.com/2026/04/15/palantir-maven-smart-system-pentagon-program-transition-feinberg/)
- [WinBuzzer — Palantir demos military AI war plans (AIPCon 9)](https://winbuzzer.com/2026/03/16/palantir-demos-military-ai-war-plans-xcxwbn/)
- [Anduril Lattice Command & Control product page](https://www.anduril.com/lattice/command-and-control)
- [Anduril Lattice Developers — Sample apps](https://developer.anduril.com/samples/overview)
- [Lauren Park — Anduril Lattice case study](https://www.laurenjpark.com/work/anduril)
- [Bloomberg LP — How Bloomberg Terminal UX designers conceal complexity](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/)
- [DesignYourWay — Palantir logo, colors, font, meaning](https://www.designyourway.net/blog/palantir-logo/)
- [Designsystems.surf — Blueprint UI framework profile](https://designsystems.surf/design-systems/palantir)
- [Palantir on X — "This is Maven Smart System"](https://x.com/PalantirTech/status/2032142543022960980)
