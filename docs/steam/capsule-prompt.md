# Steam Capsule — claude.ai/design Prompt Library

> Hi-fi capsule mockups for the Phase 5 Steam Page Live milestone. Pasted into
> https://claude.ai/design (Opus 4.7). Iterate via inline `[REFINE: …]`
> comments. Once an export reads right, drop it into `docs/steam/assets/` and
> reference the file from this doc.

The universal preamble (color tokens + type stack) is the one in
`docs/CLAUDE_DESIGN_PROMPTS.md` — paste it first, then one of the prompts
below.

---

## P7-main. Main capsule (1920×620)

```
[universal preamble]

Design the Steam main capsule for Operator Sim. Output: a single 1920×620
PNG-ready frame. This is the hero on the store page, library, and home
recommendations — it must read at 200×60 thumbnail and at full size.

Composition:
  - LEFT 60%: a vertical typographic stack on the --bg-base ground:
      kicker:    "OPERATOR SIM"
                 12px JetBrains Mono uppercase, tracking 0.28em, --fg-bright
      ----
      title:     "HOLD THE FLOOR"
                 88-104px IBM Plex Sans Bold, --fg-bright, tight tracking
      sub:       "A dispatch simulator on the city you live in."
                 18-20px IBM Plex Sans, --fg-dim, sentence case
      ----
      strap:     three 10px mono uppercase tags separated by · :
                 "FIRE · EMS · POLICE · SWAT"
                 --accent-cyan tone, tracking 0.22em
  - RIGHT 40%: a 2.5D isometric city slice (Davenport core), rendered in
    --bg-panel for ground, --border-bright for road centrelines, with three
    glowing pinpoints in --accent-cyan, --accent-amber, --accent-crimson
    representing one of each: an active EMS run, a pending fire, a critical
    police incident. The city silhouette must read as schematic — not a
    photographic 3D render. Think Google Maps satellite at low zoom with a
    Maven overlay, not Cities: Skylines.

Atmosphere:
  - Single-pixel hairline grid in --border-subtle behind everything at 4%
    opacity. Calm scanline-density, no movement.
  - A faint vignette in --bg-base bringing focus to the centre.
  - Zero gradients in the city, zero glow blooms. Glow only on the three
    incident pinpoints.

Bottom-edge metadata strip (60px tall):
  - LEFT: "EARLY ACCESS" 10px mono uppercase, tracking 0.22em, --accent-cyan
  - CENTRE: appid placeholder "SteamDB · TBD" --fg-mute
  - RIGHT: weekly devlog cadence promise "WEEKLY · SUN 17:00 CT" --fg-mute

Constraints:
  - Title can NOT use a cartoon or "wacky" font. Plex Bold or DM Sans Bold
    only. The product is not whimsical.
  - No icons, no truck/lights/badge cartoons. The map and the typography
    are the entire visual.
  - Readable at 200×60 thumbnail: confirm by rendering a 200×60 preview.
```

---

## P7-small. Small capsule (462×174) — derivative

```
[universal preamble]

Derive a 462×174 small capsule from the main capsule (P7-main). At this
size, drop the right-hand city render and keep:
  - "OPERATOR SIM" kicker, 11px mono, tracking 0.24em, --fg-bright
  - "HOLD THE FLOOR" title, ~42px Plex Bold, --fg-bright, two lines max
  - A single 8px --accent-cyan dot to the left of the title line as the
    only "logo" mark
  - "FIRE · EMS · POLICE · SWAT" strap at 9px mono, --accent-cyan tone

Background stays --bg-base with the 4%-opacity hairline grid. No vignette
at this size — too small to read.
```

---

## P7-header. Header (460×215) — also derivative

```
[universal preamble]

Header is the in-game library cover when the user has Operator Sim
installed. 460×215. Compose like the small capsule (P7-small) but flip:
title on the LEFT, a 120×120 schematic of the iso city slice on the
RIGHT. The city slice is the same as P7-main, just cropped to its core
intersection.

Optional micro-strip at the bottom (~20px tall):
  - "v0.x — EA" 9px mono, --fg-mute, left-aligned
  - "OPERATOR SIM" 9px mono, --fg-bright, right-aligned
```

---

## P7-hero. Library hero (3840×1240)

```
[universal preamble]

The library hero is what the user sees behind the title on their Steam
library card. 3840×1240, ultra-wide. Compose the same iso city slice but
panoramically: 9 city blocks wide instead of 3, with the operator console
strip (top strip from P1) reproduced as a 56px-tall overlay at the
*bottom* of the frame. No title text at all — the title sits over this
hero in Steam's own typography.

Treatment notes:
  - The bottom 56px operator strip shows live-looking KPI tiles
    (UNITS / ACTIVE / QUEUED / RES TIME / GRADE) — pure typography, no
    data dots.
  - Above that, the iso city in the same render style as P7-main.
  - Across the upper third, three faint trace-paths in --accent-cyan
    suggesting active dispatches mid-route. 1px lines, no glow.
  - No text other than the operator-strip KPI labels.
```

---

## P7-logo. Library logo (1280×720 transparent PNG)

```
[universal preamble]

Library logo is the floating title text Steam composites over the library
hero. Transparent PNG, 1280×720.

Content (single typographic mark, no map, no chrome):
  - Top row: "OPERATOR" 220-280px Plex Bold, --fg-bright
  - Bottom row: "SIM" 220-280px Plex Bold, --fg-bright, tracked slightly
    wider so the two rows visually balance
  - Single 24px --accent-cyan dot to the immediate LEFT of "OPERATOR" — the
    same "live indicator" dot from the top strip in the actual game

That's it. No glyph, no underline, no kicker. The visual quote is the
same calm typographic confidence the game's interface carries.
```

---

## P7-screenshots. Phase-5 screenshot framing (1920×1080 × 5)

```
[universal preamble]

Not a generated image — a *framing list* for OBS + Playwright-scripted
gameplay capture during Phase 5. Each line is one screenshot.

1. Boot lobby with all four shifts visible, T1 unlocked + cleared chip,
   T2/T3 locked. Cursor hovering on T3 to show the locked tooltip.
2. Tier 2 mid-shift: MapLibre view with 3 active routes (cyan paths),
   station markers visible, ShiftHUD top-strip showing the spawn meter +
   3 narrative-arc chips, Ctrl+K palette open in foreground typing
   "dispatch E1 ".
3. Tier 2 iso city view: same scene as (2) but with the CITY toggle on,
   day/night midway through sunrise (TOD ~0.3), dashed iso response lines
   visible.
4. Police shift mid-warrant: dossier panel showing the apex incident's
   required_units (patrol + k9 + swat_armored + ambulance_als), all four
   units en_route, detection meter ticking. Right-rail open on the
   incident.
5. End-of-shift summary modal: S/A/B/C/D grade chip prominent, per-
   incident table showing late/on-time, save-this-run button visible
   (Day 14 save verb path).

Each screenshot must show ≥40 datapoints above the fold per the GDD
density rule. No PII/real-name overlays.
```

---

## P7-trailer. 60s trailer beats (Phase 5)

Outline only — a real trailer needs DaVinci Resolve via computer-use, not
claude.ai/design.

1. 0:00–0:08  cold open — terminal boot sequence, the LIVE dot blinks
              on, "WATCHFLOOR · QUAD CITIES · SECTOR 1" header types in.
2. 0:08–0:20  Ctrl+K palette demonstration, dispatching E1 to a cardiac
              call, MapLibre route paints down Brady Street.
3. 0:20–0:35  Police-shift apex (qc_police_001): four units committed,
              countdown ticking, dwell timer green.
4. 0:35–0:48  Tier 3 narrative-arc montage: Brady caller cycle ends with
              the cardiac, heatwave EMS cluster lights up the map.
5. 0:48–0:56  S-grade summary card, weekly devlog promise on screen.
6. 0:56–0:60  Logo + "WISHLIST NOW" — wishlist drives the Phase 5
              economy.

Audio bed: muted, two-note synth pulse, no music spike. Mix to -16 LUFS
per Steam target.

---

## Iteration tips

- Generate at full Steam dimensions first, never thumbnail-then-upscale.
- After every export, render it at 200×60 in a preview tile alongside the
  full-size frame and ask yourself: *does the kicker still read?* If not,
  iterate the small-size hierarchy.
- Compare side-by-side against the in-game `TopStrip.tsx` render to keep
  the typographic tone matched. The capsule and the running game should
  feel like the same product.
- Keep refinements to one variable at a time. "Make the title bolder AND
  recolor the city" = bad iteration cycle. Two passes, one change each,
  always converges faster.
