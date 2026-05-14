# Operator Sim — Reveal Trailer

**Length:** 45 seconds (Steam page cap = 60s; aim under to keep punch)
**Aspect:** 16:9, 1920×1080, 60fps, .mp4 H.264 high
**Audio:** Mono voiceover OK; stereo music bed
**Title card:** lands at 0:38, holds 7s
**Tone:** Foundry / Severance / The Wire dispatch room. Calm, terse, weight of consequence.

> **What this asset does.** Drives the Steam wishlist conversion off the
> Coming-Soon page. Embed in `coming-soon.md` as the primary video. Cut
> short variants (15s loop for socials, 6s bumper for the capsule) from
> the same OBS source — same shots, fewer of them.

---

## Voiceover script (45 seconds)

| Time | VO line | On-screen |
|------|---------|-----------|
| 0:00 | *[ambient room tone, terminal hum]* | Black. Single typing cursor. |
| 0:02 | "There are eleven seconds between the call coming in and you having to pick a unit." | Cursor types: `> dispatch_` → fade to live console. |
| 0:08 | "Wrong unit, wrong outcome." | CenterMap MapLibre view, three incident pins fade in (cyan, amber, crimson). |
| 0:11 | "It's not the lights. It's not the chase." | LeftRail flickers — selected unit changes twice. |
| 0:15 | "It's the **floor**." | Cut to 2.5D isometric city view. Glow under the title word *floor*. |
| 0:17 | "Davenport, exactly as it is — twenty-six thousand roads, two stations, eight units." | Closeup on a dispatch trail snaking through a real OSM road grid. |
| 0:23 | "Fire. EMS. Police. SWAT." | Four-shot quick-cut, one unit class per shot. Hold 0.5s each. |
| 0:25 | "You don't drive them. You assign them. And then you watch." | Static map; unit dot routes home after a resolution. |
| 0:32 | "Twelve minutes of game time. Forty-eight real seconds. Three calls, or thirty." | Time scale toggle visible (0.5× / 1× / 2× / 4×). |
| 0:38 | **[title card]** | "OPERATOR SIM — HOLD THE FLOOR" centered, in style of capsule P7-main. |
| 0:42 | "Demo live. Wishlist on Steam." | Steam logo, wishlist URL, demo URL. |
| 0:45 | *[fade]* | Black. |

---

## Shot list (12 shots)

| # | Duration | Content | Source / how to capture |
|---|----------|---------|-------------------------|
| 1 | 0:00–0:02 | Black w/ typing cursor | After Effects or Premiere title — generate, no game capture needed |
| 2 | 0:02–0:08 | Cursor types `> dispatch_` → fade to live CommandPalette `dis` autocomplete | OBS: Ctrl+K open, type "dis", let suggestions appear, hold 1s. Record idle, mute. |
| 3 | 0:08–0:11 | MapLibre top-down with three new incidents spawning | OBS: load `qc_tier3_001` shift at 1× speed. Set quality to Hardware (NVENC), 60fps. |
| 4 | 0:11–0:15 | LeftRail unit selection cycling | OBS: click 3 different units in sequence; capture only the rail (crop in post). |
| 5 | 0:15–0:17 | Iso city view zoom-in on the word *floor* moment | Switch view_mode to 'city'; pause sim at a moment with all unit types active. |
| 6 | 0:17–0:23 | Slow pan over a dispatch trail on OSM roads | OBS: assign a unit, follow with map pan during the route. 6s. |
| 7 | 0:23–0:25 | Engine→Ladder→Ambulance→Patrol quick cuts (0.5s each) | Four unit cards from dossier panel in succession, OR map closeups on each class. |
| 8 | 0:25–0:32 | Wide static map showing one unit returning home post-resolution | After resolution, watch the unit RTQ for 7s. |
| 9 | 0:32–0:38 | Time-scale toggle (TopStrip) with shift HUD ticking 4× faster | Click 1×→2×→4×; HUD timer ticks visibly. |
| 10 | 0:38–0:42 | Title card "OPERATOR SIM — HOLD THE FLOOR" | After Effects from capsule design template. |
| 11 | 0:42–0:44 | Steam wishlist URL + demo URL | Centered, 18pt JetBrains Mono, cyan accent. |
| 12 | 0:45 | Black fade | Plate. |

---

## Music

**Style ref:** Mark Linkous (Sparklehorse), Loscil, The Caretaker, Twin Peaks Fire Walk With Me ambient bed.

Free-license tracks that fit (use one or stitch two):
- **Kevin MacLeod — "Hidden Past"** (Incompetech, CC-BY) — sparse synth pad
- **Chris Zabriskie — "Cylinder Five"** (CC-BY) — ambient cello
- **Lee Rosevere — "Slow"** (FMA, CC-BY) — minimal piano under-bed

Mix: bed at -22 LUFS, voiceover at -16 LUFS, hard pause for the 0:15 "floor"
emphasis. No build-up to title — title lands without a swell.

---

## Capture checklist (Kruz's TODO)

- [ ] Set OBS scene: 1920×1080, 60fps, NVENC H.264 high profile, CBR 16 Mbps
- [ ] Disable WIN+R+Backspace overlays; close everything except the dev build
- [ ] Run dev with `npm run dev`; URL bar hidden via F11 fullscreen
- [ ] Load `qc_tier3_001` shift for shots 3–9 (most visual variety)
- [ ] Record 3× passes of each shot — keep the cleanest take
- [ ] Drop all shots into a single Premiere/DaVinci project; aim for ≤45s
- [ ] Title card from `docs/steam/assets/capsule_main.png` once generated
- [ ] Export Master at 1080p60 H.264; second export 720p30 for socials
- [ ] Upload to Steamworks (when appid lands), YouTube, Twitter, Bluesky
- [ ] Embed the YouTube link in `docs/steam/coming-soon.md` ("Trailer")

---

## Short variants

**15s socials loop (Twitter/Bluesky/Threads):**
Strip the VO. Cut shots 3, 4, 8, 9, 10 only. Add the strap-line as
typewriter text under the title card: "Demo live · operator-sim.vercel.app".

**6s vertical bumper (TikTok/Shorts):**
Black → typewriter "TIER 3 — POLICE-LED" → 3.5s of iso-view route → title card.

---

## Don'ts

- **No sirens.** This is a dispatch sim. The sirens are the calls coming in,
  not the soundtrack. One subtle radio crackle at 0:02 is fine. That's it.
- **No "VS GTA" framing.** Operator Sim is not Police Stories. We don't sell
  on action; we sell on weight.
- **No tycoon language.** No "Build your empire." No "Hire and fire." Wrong
  brain space for the product.
- **No mobile shots.** Steam audience plays on desktop. We don't pretend.
