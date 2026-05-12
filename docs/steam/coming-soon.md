# Operator Sim — Steam Coming-Soon Page

**Status:** Day 14 draft (Phase 2, sprint Days 14-21). De-risks the Phase 5
Steam Page Live milestone (Sep 2026). Copy here is the source of truth that
gets pasted into Steamworks when the appid is provisioned in Phase 4.

> **Tone reminder.** No "rescue management," no "tycoon," no cartoon
> language. We are a Foundry/Maven-aesthetic dispatch sim. Pace > spectacle.
> The interface is the differentiator — say so.

---

## Title

**Operator Sim**

## Tagline (under 50 chars)

> Dispatch. Hold the floor. Earn the radio.

(Alts to A/B in Phase 5 once a real audience exists:
- "You are the watchstander."
- "Every call is a decision.")

## Short description (300 char hard limit)

> A Foundry-grade dispatch simulator on real city maps. Hold the floor at a
> regional Joint Operations Center: command fire, EMS, police, and SWAT
> through a keyboard-first command palette. Calm by default, chaotic when
> you let it.

(296 chars. Counted including spaces.)

## Long description

> **You are the watchstander.**
>
> Operator Sim drops you behind the desk at a regional Joint Operations
> Center. The map is your real hometown — drawn from OpenStreetMap, not a
> stylised stand-in. Fire, EMS, police, and SWAT units stage at real
> stations on real streets. Calls come in. You decide who goes where, and
> when.
>
> Every action is a verb. `Ctrl+K` opens the command palette — type
> `dispatch E1 to incident-204`, hit Enter, and Engine 1 routes on the
> actual road graph to a real Davenport address. No cartoon trucks. No
> pixel-hunting. Just typography, status, and the radio.
>
> **The pace is yours.** Tier 1 is contemplative. Tier 5 is chaotic. You
> earn each unlock by holding the floor at the previous tier. The
> difference between a B-grade shift and an S-grade one is whether you
> staged the ambulance before the cardiac escalated, whether you committed
> both engines to the structure fire or hedged, whether you trusted the
> repeat caller on Brady Street the third time she rang in.
>
> **Every shift is a story.** Shifts are not random spawns. A heat-wave
> EMS cluster, a Brady Street pattern that ends with a SWAT-needed
> warrant, a peak-noon structure fire that wants every fire unit you have
> on scene at once. Threads carry across shifts the way they do on a real
> watch.
>
> **What's in the box for Early Access:**
>
> - Real Quad Cities OSM map (full bbox, ~6,000 baked addresses)
> - 5 difficulty tiers with competence-gated unlock
> - Fire, EMS, police agencies; engine / ladder / ambulance / patrol / K9 /
>   SWAT classes
> - Multi-unit incidents (an MVA wants engine + ambulance simultaneously,
>   a warrant wants patrol + K9 + SWAT + ambulance)
> - Keyboard-first command palette with typed slot autocomplete
> - DM-authored narrative threads (60+ shifts at launch, growing)
> - Save / replay every run from Dexie-backed snapshots
> - Career progression that gates new tiers behind cleared shifts
> - Foundry-grade typographic interface — no cartoon, no skeuomorphism

## Feature bullets (Steam-formatted, 6-8 lines)

* **Real city, real radio.** Every dispatch routes on the actual OpenStreetMap road graph for your hometown. Default: Quad Cities (Davenport · Bettendorf · Moline · Rock Island). More cities post-EA.
* **The keyboard is the controller.** `Ctrl+K` opens a typed command palette with slot-aware autocomplete. The mouse is for observation.
* **The interface is the game.** Linked entity ontology: units, incidents, callers, addresses, intel. Click any field, drill into the dossier, walk the trail.
* **Earn the chaos.** Tier 1 is calm and observational. Tier 5 is cross-agency mass-casualty. Unlock by holding the floor, not by grinding.
* **Every shift is a story.** Threaded narratives, repeat callers, BOLO alerts that resolve into apex incidents. Shifts are written, not rolled.
* **Replay every run.** Snapshot the floor mid-shift with `save <name>`, restore with `replay <name>`. Bring receipts to your friends.
* **Built to be modded.** Shift YAML is the unit of content. Drop a new file in `data/shifts/`, the in-game validator catches errors, you ship a campaign.

## Tags (request when appid lands — max 20)

`Simulation` `Strategy` `Real-Time with Pause` `Management` `Sandbox`
`Tactical` `Realistic` `Top-Down` `Singleplayer` `Atmospheric`
`Choices Matter` `Difficult` `Mature` `Replay Value` `Procedural Generation`
`Indie` `Detective` `Police` `Emergency` `Resource Management`

(20 chosen. `Procedural Generation` because the DM shifts are
Claude-generated. `Detective` because the Brady-Street pattern reads
that way at higher tiers. Drop `Detective` if Steam users find it
misleading after Phase 6 playtest.)

## System requirements (Tauri 2 build matrix)

### Minimum

- **OS:** Windows 10 64-bit / macOS 12 Monterey / Ubuntu 22.04
- **CPU:** Intel i5-6400 / AMD Ryzen 5 1600 or equivalent
- **RAM:** 4 GB
- **GPU:** Any GPU with WebGL 2 / WebGPU support (Intel HD 530+, GTX 750+, Radeon HD 7750+)
- **Storage:** 600 MB (Tauri binary + OSM bake)
- **Network:** Required only for first-run map tile fetch and optional
  Discord/Steamworks integration

### Recommended

- **OS:** Windows 11 / macOS 14 Sonoma / Ubuntu 24.04
- **CPU:** 4+ cores at 3.0 GHz
- **RAM:** 8 GB
- **GPU:** Dedicated GPU with WebGPU support (RTX 2060 / Radeon RX 5600 or newer)
- **Storage:** 600 MB
- **Display:** 1920×1080 minimum; ultrawide supported

(Tauri 2 bundles a system webview, so the bar is set by the OS's webview
runtime, not by us. Steam Deck verification target Phase 7.)

## EA disclosure (Steam requires this)

> **Why Early Access?** The interface, the FSM, and the shift system are
> all in place — what Early Access funds is *content scale*: more cities,
> more agencies, more written shifts. We ship every Sunday with a public
> changelog and a Discord-visible bug list.
>
> **Approximately how long?** 12-18 months in Early Access, depending on
> Tier 5 (cross-agency mass-casualty) balance work and the optional
> tactical breach layer in Phase 6.
>
> **How is the full version planned to differ?** More cities (target: 20+
> by 1.0), the optional Door-Kickers-style tactical layer, a campaign
> editor, Steam Workshop integration for community-authored shifts, and a
> full Tier 5 balance pass.
>
> **What is the current state?** Tier 1 is fully playable end-to-end. Tier
> 2 (EMS + police agency) is live. Tier 3 (multi-station + narrative
> arcs) is balance-pass-quality. Tiers 4-5 are mid-development.
>
> **Will the game be priced differently during and after Early Access?**
> The Early Access price reflects scope at launch. The 1.0 price will be
> set at the end of EA — likely the same or modestly higher (no surprise
> hikes), with a launch-discount window for EA owners.
>
> **How are you planning on involving the community in your development
> process?** Public Discord for bug reports + design discussion. Weekly
> changelogs. A public roadmap board with thumbs-up voting. Modding
> documentation for the shift YAML format from day one.

## Pricing placeholder (decided in Phase 7, Nov 2026)

Phase 7 will pick from the $14.99-$17.99 range. Reference points: 911
Operator at $14.99, Door Kickers 2 at $19.99 EA, This Is The Police at
$14.99. Final number lives in `docs/GDD.md` § 11. **Do not paste a price
into Steamworks until Phase 7.**

## Storefront copy QA checklist (Designer agent runs before Phase 5)

- [ ] No "rescue management," "tycoon," "wholesome," "cute," "sandbox
      builder" framing. Operator Sim is a *dispatch simulator*. Words
      matter.
- [ ] No cartoon imagery references. Capsule art is typography + a single
      hero glyph + the city silhouette.
- [ ] No vague chrome ("revolutionary," "groundbreaking"). Every claim is
      something the build actually does at the time the page goes live.
- [ ] EA disclosure block is verbatim from Steam's template fields, not
      paraphrased.
- [ ] Tag list has zero overlap with cartoon-management games — that
      cross-traffic will tank the page's conversion.
- [ ] System reqs are derived from a real Tauri build, not aspirational.
- [ ] Discord + landing-page links resolve (operator-sim.dev or whatever
      domain is live in Phase 5).
- [ ] Trailer has audio leveled to Steam's -16 LUFS target.
