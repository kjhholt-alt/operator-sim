# Claude.ai/design Prompt Library — Watchfloor

> **For:** `https://claude.ai/design` (Anthropic Labs visual designer, Opus 4.7).
> **Pattern:** copy-paste a section, optionally add `[REFINE: <change>]` to iterate.
> **Why:** Per [reference_claude_design.md](../../../.claude/projects/C--Users-Kruz-Desktop-Projects/memory/reference_claude_design.md), use this tool for hi-fi mockups before coding any new panel. Refine via inline comments + sliders, then mirror in code.

---

## Universal preamble (always paste first)

```
Design context: Watchfloor — a Foundry-grade dispatch sim built in Vite + React + Tailwind 4.
The aesthetic reference is Palantir Foundry / Maven Smart System. NOT a tycoon game UI. NOT a SaaS dashboard.
Think 24/7 watch floor at a Joint Operations Center. Dense, terminal-grade typography, fixed viewport, no scrolling in main panels.

Color tokens (use exactly):
  --bg-base       #080b12   (page background)
  --bg-panel      #0d111c   (panel surface)
  --bg-elev       #111729   (elevated surface, modals)
  --bg-hover      #162039   (hover state)
  --border-subtle #1a2235   (most borders)
  --border-bright #2b3a55   (active borders)
  --fg-mute       #4a5775   (placeholders, dimmed labels)
  --fg-dim        #6b7a96   (secondary text, hints)
  --fg-base       #c8d3e6   (body text)
  --fg-bright     #ffffff   (emphasized values)
  --accent-cyan   #4ad8e6   (live, active, selected)
  --accent-emerald #3fd97f  (resolved, safe, success)
  --accent-amber  #f0b85a   (warning, en-route, pending)
  --accent-crimson #ec5b6b  (critical, down, failed)
  --accent-violet #a07aff   (intel, linked, inferred)

Type stack:
  JetBrains Mono — for all data, IDs, coordinates, timecodes, badges
  IBM Plex Sans — for labels, prose, headings
  Sizes: 9px tracking-[0.22em] uppercase for labels, 10-11px for sublabels, 12-13px for body, 13-15px tabular-nums for KPI values

Density rule: every panel must show ≥40 datapoints above the fold.
Layout rule: fixed viewport CSS grid, no scroll except inside scoped panels.

Avoid: gradients, glassmorphism, animation easing curves, particle effects, scanlines, cute icons, color swatches outside the tokens above.
```

---

## P1. Top strip (status bar)

```
[universal preamble]

Design the 56px-tall top strip. Left to right:
  [LIVE INDICATOR · 8px emerald dot, slow pulse]
  [PRODUCT MARK "WATCHFLOOR" — 11px mono, uppercase, tracking 0.18em, fg-dim]
  [SECTOR LABEL "Quad Cities · Sector 1" — 13px sans, fg-base]
  [...flexible spacer...]
  [ZULU CLOCK "2026-05-09 04:21:33Z" — 11px mono, fg-dim, tabular-nums]
  [KPI CLUSTER — 5 stacked label/value pairs, right-aligned, 24px gap each:
    UNITS / 12 (white)
    ACTIVE / 04 (cyan)
    QUEUED / 02 (amber)
    RESOLVED 24H / 47 (emerald)
    AVG RESPONSE / 04:32 (fg-base)
  ]

The strip sits on bg-panel with a 1px border-subtle bottom edge.
No padding above 16px on any side. Nothing rounded. Sharp corners only.
```

## P2. Left rail — entity ontology

```
[universal preamble]

Design the 192px-wide left rail. Section:
  Header: 9px mono uppercase tracking-0.22em "ONTOLOGY" in fg-dim, with 1px border-subtle bottom
  
  Five entity-type rows, each 36px tall:
    UNITS         012
    INCIDENTS     004
    STATIONS      002
    PERSONNEL     048
    INTEL         007
  
  Each row: label uppercase 10px mono tracking-0.18em fg-base, count right-aligned mono tabular-nums fg-dim. 
  Hover: bg-hover, count flips to accent-cyan, label flips to fg-bright.
  Active row has a 2px accent-cyan inset left border.
  
  Footer (sticky bottom):
    Label "FILTERS" same style as header
    Below: "— none —" mute-color mono 10px

Right edge of the rail is 1px border-subtle to separate from center map.
```

## P3. Center map area

```
[universal preamble]

Design the center map area. The map itself is MapLibre GL with a dark OSM style; mock it as a black-blue tile layer with subtle gridlines and a few road network strokes in #1a2235.

Overlays:
  TOP-LEFT: bg-panel/80 backdrop-blur, 1px border-subtle, 9px mono uppercase
            "Sector 1 · 41.5236°N 90.5776°W"
            
  TOP-RIGHT: vertical stack of 2 buttons — [+] [−], each 24x24px,
             bg-panel border-subtle hover:border-bright, mono 12px fg-base
             
  BOTTOM-LEFT: legend panel, bg-panel/80 backdrop-blur, 1px border-subtle, padding 12px
               4 rows: 8px dot + 9px mono uppercase tracking-0.18em label
                 cyan · ACTIVE
                 amber · EN ROUTE
                 emerald · AVAILABLE
                 crimson · CRITICAL

Mock 3 unit dots on the map: 1 cyan dot moving (motion blur trail), 1 amber dot stationary at intersection, 1 emerald dot at a station marker (small cyan square with mono "S1" label).

Mock 1 incident: red 16px triangle outline pulsing at a residential address, with a thin cyan polyline connecting to the cyan unit dot showing dispatch route.
```

## P4. Right rail — entity dossier

```
[universal preamble]

Design the right rail (Dossier panel). 304px wide.

State 1 — empty:
  Header: "DOSSIER" 9px mono uppercase tracking-0.22em fg-dim
  Body: "— no entity selected —" mute color mono 10px
        Below: 11px sans fg-dim leading-relaxed
        "Click a unit, incident, or address on the map or in the ontology rail to open its dossier here."
  Sub-sections (collapsed): "LINKED ENTITIES" and "TIMELINE", with "—" beneath each

State 2 — Unit selected (Engine 1, "E1"):
  Header value: "E1 · ENGINE 1" 14px mono fg-bright
  Status badge: "EN ROUTE" amber, mono 9px uppercase tracking-0.2em, 1px amber border
  
  Block: KEY METRICS (3-col grid)
    HOMEBASE / Station 1
    CREW / 4 / 4
    ETA / 03:14
  Each label 9px mono dim, value 12px mono fg-bright tabular-nums.
  
  Block: LINKED ENTITIES (5 rows, dense)
    INCIDENT  →  I-2031 · Residential fire     [accent-amber link]
    STATION   →  S1 · Davenport Central        [accent-cyan link]
    CALLER    →  Margaret K., 67yo female      [accent-violet link, inferred]
    ADDRESS   →  1421 Brady St                 [accent-cyan link]
    INTEL     →  Pattern: 3 Brady checkins     [accent-violet link]
  
  Block: TIMELINE (mini-sparkline + last 6 events)
    Sparkline: 24px tall, 280px wide, response-time over last 24h, accent-cyan stroke
    Events list: time (mono 10px tabular-nums) + event (sans 11px), 6 rows
      04:21:18Z  dispatched to I-2031
      04:18:02Z  returned to station
      03:54:11Z  resolved I-2027
      ...

Density rule still applies. ≥40 datapoints visible.
```

## P5. cmdk command palette (Ctrl+K)

```
[universal preamble]

Design the command palette modal. 640px wide, centered horizontally, top of frame at 15vh.
Container: bg-panel, 1px border-bright, 1px ring of accent-cyan/30, no border-radius, sharp shadow.

Header bar (44px tall):
  Left: "COMMAND" label 10px mono uppercase tracking-0.22em accent-cyan
  Center: input field, transparent bg, no border, placeholder "dispatch, recall, hire, place_station…" in fg-mute
  Right: "ESC" kbd, mono 10px fg-mute

Body (max 50vh, scroll inside):
  Group label "VERBS" mono 9px uppercase tracking-0.22em fg-mute, padded
  
  Each verb row (36px tall, 1px border-subtle/50 bottom):
    Left cluster (gap 12px):
      [verb id]   10px mono uppercase tracking-0.18em accent-cyan, 96px width
      [label]     12px sans fg-base
    Right: hint text, mono 10px fg-mute, e.g. "dispatch E1 4"
    
    Selected row: bg-hover, label fg-bright

Show 6 verbs as examples:
  dispatch     dispatch unit to incident       dispatch E1 4
  recall       recall unit                     recall E1
  hire         hire personnel                  hire firefighter
  place_station  place station                 place_station fire
  focus        focus on map                    focus E1
  pause        pause game                      pause
```

## P6. Bottom ticker (radio chatter)

```
[universal preamble]

Design the 32px-tall bottom ticker.
Left: 6px cyan dot pulsing slow + "RADIO" 10px mono uppercase tracking-0.2em fg-dim
Center: live radio chatter, single line, mono 10px fg-mute, scrolling left, no animation easing
  Sample text: "10-04 E1 dispatched 1421 Brady · M2 returning station · BOLO blue sedan IL plate · weather warning hailstorm 22:00"
Right cluster (gap 16px):
  Build label: "Build v0.1.0" — "Build" fg-mute mono 10px, version fg-dim mono 10px
  Hotkey hint: kbd "Ctrl+K" 10px mono fg-base + "command" 10px mono fg-mute

Footer top edge: 1px border-subtle. Background bg-panel.
```

---

## Iteration prompts

After Claude Design produces a draft, use these to refine:

- `[REFINE: bump density — every panel needs more data, currently feels too airy]`
- `[REFINE: kill all border-radius, this should feel like Bloomberg / Foundry, not Linear]`
- `[REFINE: move all gradients off — solid colors only]`
- `[REFINE: tighten the type — 11/12/13 is the only allowed body size range]`
- `[REFINE: that accent should be cyan #4ad8e6, not blue]`

## When to use Claude Design vs code-it-yourself

| Use Claude Design | Code it yourself |
|---|---|
| Net-new panel, design space unclear | Component already mocked, just implement |
| Marketing landing page | Stable internal layout |
| Steam capsule art | Bug fix |
| Hi-fi mockup for stakeholder review | Iteration on existing code |
| Concept exploration ("what if the dossier had sparklines per row?") | Production rendering |
