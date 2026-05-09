---
summary: Real-world emergency dispatch primer covering NFIRS taxonomy, CAD record structure, unit FSMs, radio codes, apparatus ontology, ICS/mutual aid, NFPA response benchmarks, and the texture of an actual dispatcher's shift. Designed to keep Watchfloor authentic without forcing the player to memorize 600 codes.
actionable_for: [designer, implementer-a]
sources: 22
written: 2026-05-09
---

# Dispatch Domain Dossier

A field manual, not an encyclopedia. Every section ends in a note about what to keep and what to drop for a sim that has to be playable.

---

## 1. NFIRS / NERIS — The Incident Taxonomy

**NFIRS** (National Fire Incident Reporting System) was the USFA/FEMA standard from 1976 to **January 1, 2026**, when **NERIS** (National Emergency Response Information System) replaced it. Most departments still use NFIRS-5 vocabulary internally; NERIS adds all-hazards, real-time submission, and richer schemas. For a sim the NFIRS coding model is the canonical one, because it's the thing every working firefighter knows.

The coding scheme is a **3-digit hierarchical numeric** code. The hundreds digit picks the series; the tens picks the subgroup; the ones picks the specific incident.

| Series | Category | Example sub-codes |
|---|---|---|
| 100 | **Fire** | 111 building fire · 112 fire in structure (non-building) · 113 cooking fire confined · 114 chimney/flue fire · 121 fire in mobile property used as fixed structure · 130 mobile property (vehicle) fire · 131 passenger vehicle fire · 140 natural vegetation fire · 141 forest/woods/wildland fire · 151 outside rubbish fire |
| 200 | **Overpressure / Rupture / Explosion (no fire)** | 211 overpressure rupture from steam · 221 overpressure rupture of air/gas pipe · 231 explosion (no fire), other · 251 excessive heat, scorch burns with no ignition |
| 300 | **Rescue & EMS** | 311 medical assist (lift assist) · 320 emergency medical service · 321 EMS call (excluding MVA) · 322 motor-vehicle accident with injuries · 323 MVA with no injuries · 331 lock-in (extricate person) · 341 search for person on land · 342 search for person in water · 352 extrication of victim from vehicle · 353 removal of victim from stalled elevator · 360 water/ice rescue |
| 400 | **Hazardous Condition (no fire)** | 411 gasoline or other flammable liquid spill · 412 gas leak (natural gas/LPG) · 413 oil/combustible liquid spill · 422 chemical spill or leak · 424 carbon monoxide incident · 440 electrical wiring/equipment problem · 444 power line down · 463 vehicle accident, general cleanup |
| 500 | **Service Call** | 510 person in distress · 511 lock-out · 520 water problem · 522 water/steam leak · 531 smoke or odor removal · 542 animal rescue · 550 public service assistance · 553 public service · 561 unauthorized burning |
| 600 | **Good Intent Call** | 611 dispatched & cancelled en route · 621 wrong location · 622 no incident found on arrival (UTL) · 631 authorized controlled burn · 641 vicinity alarm · 651 smoke scare, odor of smoke |
| 700 | **False Alarm / False Call** | 710 malicious mischief alarm · 711 municipal alarm system malfunction · 730 system malfunction · 733 smoke detector activation due to malfunction · 740 unintentional system activation · 743 smoke detector activation, no fire · 745 alarm system activation, no fire |
| 800 | **Severe Weather / Natural Disaster** | 811 earthquake assessment · 812 flood assessment · 813 wind storm · 814 lightning strike (no fire) · 815 severe weather/natural disaster standby |
| 900 | **Special Incident Type** | 911 citizen complaint · 900 special-type other |

**Source:** USFA NFIRS Complete Reference Guide (2015); Responserack NFIRS index; Wisconsin DSPS NFIRS code list.

EMS dispatch additionally uses the **Medical Priority Dispatch System (MPDS)** with determinant levels — `Omega` (lowest), `Alpha`, `Bravo`, `Charlie`, `Delta`, `Echo` (immediately life-threatening). Format: `<chief-complaint #>-<determinant letter>-<sub#>`, e.g. `26-D-2` is "sick person, unresponsive." This is the vocabulary EMDs actually speak.

---

## 2. CAD — What an Incident Record Actually Looks Like

A real CAD record (Tyler New World, Hexagon OnCall, Motorola PremierOne, Central Square, 10-8 Systems) is far more structured than what films show. Minimum fields:

- **CFS / Incident #** — globally unique, sequential per agency, format usually `YYYY-NNNNNN`.
- **Call received timestamp** + every subsequent state-change timestamp. The timeline IS the record.
- **Caller ANI/ALI** — phone number + auto-located address from 911 trunk. Cell phone calls deliver Phase I (tower) or Phase II (lat/lon ±50m) location.
- **Incident location** — geocoded address, lat/lon, common-place name, premises-history flag.
- **Reporting party** — name, callback, relationship to incident.
- **Nature / type** — NFIRS or department-specific call code.
- **Priority** — usually 1 (life-threatening) through 5 (routine).
- **Assigned units** + role on scene (primary, backup, command, transport).
- **Narrative / event chronology** — append-only, every keystroke from call-taker timestamped.
- **Disposition** — final outcome code (arrest, report taken, GOA, transport refused, etc.).
- **Cross-references** — case #, tow #, fire-report #, related incidents.

CAD systems are **append-only by design**. You cannot edit history; you can only add notes. This matters for the sim — a player should never be able to "undo" a dispatch decision, only correct it forward.

CAD-to-CAD interoperability is still painful in 2026 — NHTSA's 2022 report calls it "the dominant gap in regional 911." Watchfloor can ignore inter-agency CAD plumbing entirely without losing realism.

**Source:** BJA *Law Enforcement CAD Systems* standard functional specification; NHTSA *CAD Interoperability Final Report* (July 2022); DHS S&T CAD TechNote.

---

## 3. Unit FSM — Status Codes

Every CAD tracks units through a finite state machine. The states below are the **plain-language NIMS forms**; the parenthetical 10-codes are the historic radio shorthand.

| State | Plain language | Common 10-code | Notes |
|---|---|---|---|
| AVAILABLE | "In service / available" | 10-8 | At post or roving, takes calls |
| OUT OF SERVICE | "Out of service" | 10-7 | Mechanical, end of shift, training |
| ASSIGNED | "Dispatched / assigned to call" | — | CAD has put a CFS on this unit |
| ENROUTE | "Responding / en route" | 10-17 / 10-76 / "responding" | Wheels rolling toward incident |
| ON SCENE | "Arrived / on scene" | 10-23 / 10-97 | Time-stamped — the legally important one |
| AT PATIENT | "At patient side" (EMS only) | — | Subsplit of on-scene; matters for cardiac timing |
| TRANSPORTING | "Transporting / en route to hospital" | 10-77 (EMS) | Often with a destination + condition code |
| AT HOSPITAL | "At facility / wall time" | — | Until bed is open and crew is clear |
| RETURNING | "Returning to quarters" | 10-19 | Back to station, still available for diversion |
| AT QUARTERS | "In quarters" | — | Crew off the apparatus |
| MEAL / TRAINING / FUEL | various | 10-7B (busy) variants | Soft out-of-service — divertible for emergencies |

Fire/EMS adds: **STAGING** (held back from the scene at a safe location until IC orders advance — used routinely on violence calls and hazmat). Police adds: **CODE 4** (no further assistance needed — closes the call without arrest).

Transitions are not free-for-all. Real CADs enforce: AVAILABLE → ASSIGNED → ENROUTE → ON SCENE → (TRANSPORTING → AT HOSPITAL)? → AVAILABLE. You cannot skip ENROUTE, you cannot go ON SCENE without an ASSIGNED. The dispatcher can override; the audit trail records every override.

**Source:** APCO 10-code reference; CHP/RadioReference expanded code lists; Tyler/Hexagon CAD product docs.

---

## 4. Radio Codes — 10-Codes vs. Plain Language

The 10-code system was invented 1937–1940 by Charles Hopper of the Illinois State Police, formalized by APCO. Designed for a world where radios had warm-up lag and channels were noisy — a one-syllable "ten" prefix told receivers a code was coming.

**Three flavors exist in the wild:**

- **APCO Project 14 / Project 38 standard list** — the closest thing to a national set. ~50 numbered codes.
- **CHP California Highway Patrol** — diverged early. e.g. CHP `11-99` = officer needs help (vs. APCO `10-33`).
- **Department-specific custom lists** — every PD adds local variants. NYPD signal codes, LAPD codes 1–7 (urgency tiers), Chicago R&I codes, etc.

Common APCO codes (the "you've seen these on TV" set):

| Code | Meaning | Code | Meaning |
|---|---|---|---|
| 10-4 | Affirmative / received | 10-20 | Location |
| 10-7 | Out of service | 10-23 | Arrived on scene |
| 10-8 | In service | 10-33 | Officer needs help (emergency) |
| 10-9 | Repeat | 10-50 | Traffic accident |
| 10-13 | Weather/road conditions | 10-76 | En route |
| 10-19 | Return to station | 10-97 | Arrived at scene |

**Post-9/11, plain language won.** The 9/11 Commission and Hurricane Katrina after-action both flagged 10-code confusion as a contributor to interoperability failure (e.g. `10-1` means "poor reception" in some places, "officer needs help" in others, "page all units" in a third). Since FY2006, **federal preparedness grant funding requires plain language for any multi-agency incident** (NIMS Alert NA:023-06, FEMA, Dec 2006). APCO formally recommended plain speech in 2012.

In practice: most agencies still use 10-codes for routine intra-agency traffic and switch to plain language whenever mutual aid arrives. Younger dispatchers (post-2010 hires) skew plain-language native.

**Crime codes** are separate. State **penal-code numbers** are the shorthand for offense type — California `211` = robbery, `187` = murder, `415` = disturbance. These are state-specific and never NIMS-standardized.

**Source:** Police1 *10-codes vs plain language*; Wikipedia *Ten-code*; copradar.com APCO list; FEMA NIMS Alert NA:023-06; CISA Plain Language FAQs (2010); APCO International Plain Speech Statement (2012).

---

## 5. Unit-Type Ontology

A clean table — none of these are interchangeable, and getting the wrong rig to a call is a real-world failure.

### Fire apparatus

| Unit | What it carries | Primary job |
|---|---|---|
| **Engine (Pumper)** | 500–1,000 gal water, 1,500–2,000 GPM pump, ~1,000 ft of hose | Get water on fire. Most common rig. |
| **Ladder / Truck** | Aerial ladder (75–100 ft), ground ladders, forcible-entry tools, **no water or pump** in pure form | Vertical ventilation, rescue, search, "truck work" |
| **Quint** | All five: pump, tank, hose, aerial, ground ladders | Hybrid for departments that can't staff both an engine and a ladder |
| **Tower (Platform)** | Aerial with bucket/basket, often a piped waterway | Elevated master stream, high-rescue platform |
| **Tanker / Tender** | 1,500–4,000+ gal water | Rural water shuttle where hydrants are absent |
| **Rescue / Squad** | Hydraulic extrication tools, ropes, confined-space gear | Specialized rescue; sometimes ALS-equipped |
| **Brush / Wildland** | 4WD, small tank, foam | Vegetation fires, off-road access |
| **Hazmat** | Detection meters, suits, decon | Chemical/bio/rad incidents |
| **Battalion / Command** | SUV, comms gear, ICS forms | Chief officer, IC role |

### EMS

| Unit | Crew | Capability |
|---|---|---|
| **BLS Ambulance** | EMT-Basic crew | CPR, AED, O2, splinting, glucose, epi-pen |
| **ALS Ambulance** | Paramedic + EMT | BLS + IV, intubation, cardiac monitor/12-lead, drug box |
| **CCT (Critical Care Transport)** | Flight nurse / paramedic | Vent, drip pumps, balloon pump — interfacility |
| **Squad / Fly-Car** | Paramedic, no patient compartment | Adds ALS to a BLS rig already on scene |
| **Air Med (HEMS)** | Pilot + flight crew | Rotor-wing transport, trauma/STEMI |

### Police

| Unit | Role |
|---|---|
| **Patrol** | Marked car, 24/7 calls-for-service backbone |
| **Traffic / Motors** | Motorcycle or marked unit, enforcement + escorts |
| **K-9** | Officer + dog: tracking, narcotics, suspect apprehension |
| **SWAT / TAC** | Barricaded subject, hostage rescue, high-risk warrants |
| **Detective / CID** | Plain-clothes, follow-up investigation |
| **Marine** | Waterway patrol, water rescue assist |
| **Aviation** | Helicopter — pursuits, surveillance, search |
| **Bomb Squad** | EOD, render-safe |
| **CIT / Crisis** | Crisis-Intervention-Team officer for mental-health calls (co-response model) |

**Source:** NFPA 1901/1906 apparatus standards; NREMT scope of practice; agency org charts (Tampa PD, Mass State Police, LBPD, Henrico County).

---

## 6. Mutual Aid and ICS

**Incident Command System (ICS)** is the modular command structure born from 1970s California wildland after-actions (FIRESCOPE) and now mandated nationwide via **NIMS** (National Incident Management System, HSPD-5, 2004).

The five ICS sections, expand only as needed:

1. **Command** — Incident Commander (IC), or Unified Command if multi-agency.
2. **Operations** — does the work (fire attack, rescue, law enforcement tactical).
3. **Planning** — situation, resources, IAP (Incident Action Plan).
4. **Logistics** — supply, comms, food, fuel, medical for responders.
5. **Finance/Admin** — costs, time, comp claims (only on big incidents).

Span of control: **3–7 reports per supervisor, 5 ideal.** Above ~7 you create a Division or Group.

**Mutual aid** kicks in when an incident exceeds local resources. Tiers:
- **Automatic aid** — pre-arranged, dispatched simultaneously with home units (border departments, common in metro fringes).
- **Mutual aid** — requested by IC, agreement-based, neighbor-to-neighbor.
- **Statewide MABAS / EMAC** — regional/state compacts for large incidents (Mutual Aid Box Alarm System; Emergency Management Assistance Compact).
- **Federal** — FEMA, USFA Type-1 IMTs, military, etc. Stafford Act activations.

For a structure fire, "second alarm" / "third alarm" is the local mutual-aid escalation — each alarm level is a pre-defined box of additional engines, trucks, and chiefs.

**Source:** FEMA NIMS Components; ICS Resource Center (training.fema.gov); Wikipedia ICS/NIMS; CalOES SEMS Foundation; ASPCA Pro NIMS/ICS overview.

---

## 7. Response-Time Benchmarks

The numbers every chief, council member, and ISO surveyor argues about.

| Standard | What it covers | Benchmark |
|---|---|---|
| **NFPA 1710** (career FD) | Call processing | ≤ 60 s, 90% of calls |
| | Turnout time (alert → wheels rolling) | ≤ 60 s EMS, ≤ 80 s fire, 90% |
| | First-due engine on-scene | ≤ 4 min travel, 90% |
| | Full first-alarm assignment (14–17 firefighters, single-family) | ≤ 8 min, 90% |
| | BLS arrival | ≤ 4 min, 90% |
| | ALS arrival | ≤ 8 min, 90% |
| **NFPA 1720** (volunteer FD) | Assembly + arrival, varies by population density | Urban 9 min @ 90% · Rural 14 min @ 80% · Remote "directly dependent on travel distance" |
| **EMS — cardiac** | Survival from witnessed VF arrest | Drops **7–10% per minute** without defib (3–4% with bystander CPR). Beyond 12 min, survival 2–5%. |
| **Police** | No federal standard | Most large-city Priority-1 targets are 5–7 min, 90%. Lower priorities 15–60+ min and rising in the 2020s. |

The "8-minute rule" is folk shorthand for two NFPA 1710 thresholds that converge — full first-alarm assembly AND ALS arrival both at 8 min. Neither is a statutory mandate; they are consensus standards. Many small / rural / volunteer departments cannot meet them and don't pretend to.

**Source:** NFPA 1710 (2020 ed.) and NFPA 1720 standard development pages; AHA Chain of Survival; Cummins et al., *Predicting Survival from Out-of-Hospital Cardiac Arrest: A Graphic Model* (Annals Emerg Med 1993, PMID 8214853); Frontiers Digital Health 2025 cardiac arrest model.

---

## 8. Real Call Pacing

What an actual shift looks like at a mid-size US city (think 200k–500k pop, single PSAP):

- **Call volume:** 50–150 calls per dispatcher per 12-hour shift is typical. SF EMS alone runs ~200 calls/day citywide; per-dispatcher rate is ~6–12/hr at peak, lower overnight.
- **Mix:** ~64% of fire-department runs are EMS, ~4% actual fires, balance is service / good-intent / false alarm. Police runs are dominated by traffic, disturbances, alarms, and welfare checks — actual in-progress violent crime is single-digit percent.
- **Answer-time standard:** 95% of 911 calls answered within 15 seconds (NENA / NFPA 1221 / many local SOPs).
- **Shifts:** 12-hour rotations are most common (3-on/3-off "Pitman" or 4-on/4-off variants). Each radio channel staffed independently — fire, EMS, police often on separate dispatchers.

**A working structure-fire timeline (suburban, single-family, NFPA 1710 compliant):**

```
T+0:00   911 ANI/ALI rings PSAP
T+0:15   Call-taker has caller, location confirmed
T+0:45   Call-taker hands CFS to fire dispatcher
T+1:00   Box alarm dispatched: 3 engines, 1 truck, 1 medic, 1 BC (NFIRS 111)
T+1:30   First engine ENROUTE (turnout ≤ 80s)
T+5:00   First engine ON SCENE — IC established, "Smoke showing 2-story SFD, side A"
T+6:00   Primary search underway; first attack line stretched
T+8:00   Full assignment on scene (14+ firefighters)
T+12:00  "Knockdown" — flames suppressed
T+15:00  Primary search complete (PAR — Personnel Accountability Report)
T+25:00  Fire under control
T+45:00  Overhaul (checking for hidden fire) begins
T+90:00  Units returning, last engine clears for hydrant + hose load
T+120:00 IC clears scene; investigator arrives if cause unclear
```

Police on a Priority-1 in-progress: dispatch → enroute is ≈ 10–30 s, on-scene 4–7 min, primary unit clears in 30–90 min depending on arrest paperwork. Routine non-injury MVA: 60–90 min from dispatch to clear.

---

## 9. Aaaa-Grade Nuance — Real vs. Movie Dispatch

The texture an authentic sim must capture, mostly absent from film:

1. **80% of a dispatcher's shift is mundane.** Welfare checks, false alarms, lock-outs, lift-assists, repeat runs to the same address. The action shows up in 30-second bursts.
2. **Multi-channel cognitive load.** A police dispatcher works 1–2 talkgroups + 1–2 incoming-911 lines + the CAD keyboard simultaneously. Fire/EMS dispatchers run a fireground tac channel, dispatch channel, and inter-agency channel. The skill is **task-switching without dropping anyone**.
3. **The dispatcher is the legal record-keeper.** Every transmission is logged; CAD timestamps are subpoenaed in court. Real dispatchers never improvise wording — there are scripts ("scripts" = MPDS guide cards, APCO Project 33 cards).
4. **Hand-offs are constant.** Shift change, channel change, jurisdiction change. A bad hand-off is how calls die. The "mike pass" at change of watch is its own little ceremony.
5. **The dispatcher as therapist / lifeline.** On suicide, OB, cardiac-arrest CPR-instructions, and active-violence calls, the dispatcher stays on the line for the duration. EMD Protocol 41 (IAED, 2024) is the formal tool. Dispatchers report **the highest rate of suicidal ideation among first responders (~21%)** — the work is corrosive in a way movies never show.
6. **Paperwork is the back half of every call.** Disposition codes, supplements, NIBRS classification for police, NFIRS for fire, ePCR for EMS. A dispatcher closes 50 calls a shift; each one has a fielded form.
7. **Stale information is a hazard.** A unit that says ENROUTE but hasn't moved in 4 minutes is a problem. CADs run "status timers" that nag the dispatcher to re-check overdue units.
8. **Officer/medic safety overrides everything.** Status check ("10-12, status?") on a unit that's gone quiet is the highest-priority transmission; a real dispatcher will step on every other channel to get it.
9. **Geography is muscle memory.** Senior dispatchers know the city by intersection, alarm box, hydrant grid, hospital trauma level. Newer staff lean on the CAD map. Watchfloor can model this as a competence stat.
10. **Boredom is dangerous.** Long stretches of nothing wreck attention — when the big call comes in, it's at minute 412 of a quiet 720-minute shift. Fatigue + transition is when errors cluster.

**Source:** AEDR Journal (mental health dispatch training studies); IAED Journal *Proceed With Caution*; NCBI PMC scoping review of dispatcher depression/suicidal ideation; BJA *Essential Elements of PMHC* call-taker protocols.

---

## For the Game — 10 Design Decisions Watchfloor Should Make

1. **Plain language by default; 10-codes as a Captain-tier difficulty toggle.** Matches post-NIMS reality, lowers onboarding cost, lets the dedicated player flip on the harder vocabulary as a flex.
2. **Use the NFIRS 100/200/300/400/500/600/700/800/900 series as the canonical incident taxonomy.** Don't invent codes. Three digits, hover-tooltip the meaning. NERIS naming if you want a 2026-current label, NFIRS shape underneath.
3. **Model the unit FSM as a hard state machine with timestamped transitions and an audit log.** AVAILABLE → ASSIGNED → ENROUTE → ON SCENE → (TRANSPORTING → AT HOSPITAL)? → AVAILABLE. Players "correct forward," never edit history.
4. **Status timers nag the player.** A unit ENROUTE for >4 min without arrival pings yellow. The skill being trained is *noticing*, not *remembering*. This is the core game loop.
5. **A shift is 80% pacing, 20% surge.** Don't fill the screen with constant alarms. The realism — and the dread — is in the long quiet stretches that suddenly aren't.
6. **Multi-channel is the difficulty curve.** Tier 1 player runs one channel. Captain runs three. The cognitive load IS the fantasy.
7. **NFPA 1710 timing thresholds drive scoring.** Call-processing ≤60s, turnout ≤80s, first-due ≤4min, full alarm ≤8min, ALS ≤8min. Show them as bars filling — green/yellow/red — not numeric scores. Cardiac calls visibly degrade survival per minute on screen (the 7–10%/min curve from Cummins).
8. **Apparatus types are not interchangeable.** Sending an Engine to a high-rise fire alone is wrong; needing a Quint for vertical vent matters. Wrong-rig dispatch should fail the call mechanically, not just cosmetically. The ontology is the puzzle.
9. **Mutual aid as an unlockable lever, not free.** Every mutual-aid request costs reputation/budget and triggers ICS Unified Command — more comms overhead, more channels open. Makes "do I escalate?" a real decision rather than a free button.
10. **Suicide / mental-health calls are first-class content, handled with weight.** Plain-language script options drawn from EMD Protocol 41 and CIT principles, with the dispatcher staying on the line. No score-multiplier on these — outcome is "caller safe / handed off to crisis team / officer on scene." Dispatcher mental-health is itself a meter; ignore self-care stretches and cumulative stress affects later-shift performance. This is what separates Watchfloor from Tycoon clones.

---

## Gaps / Open Questions

- **NERIS code mapping** — NERIS is six months live as of writing; full crosswalk to NFIRS is still being published by USFA. Treat NFIRS-5 as canonical until a stable NERIS reference appears.
- **Police priority-code standardization** — there isn't one. Each city differs (LAPD 1–7, NYPD signal codes, Chicago R&I). Pick one (LAPD-style 1–4 is most legible) and ship.
- **Dispatcher-side mental-health modeling** — no off-the-shelf framework; build something light or it becomes the whole game.

## Sources

- USFA / FEMA — *NFIRS Complete Reference Guide* (2015) · *NFIRS Documentation Hub* (usfa.fema.gov/nfirs)
- Wisconsin DSPS, Oregon OSFM, Texas TDI — state NFIRS code references
- Responserack — NFIRS incident type / property use index
- NFPA — *Standard 1710* (career FD) and *Standard 1720* (volunteer FD) development pages
- BJA — *Law Enforcement CAD Systems* functional standard (LEITSC)
- NHTSA / National 911 Program — *CAD Interoperability Final Report* (July 2022) and *Strategies for the Future* (March 2023)
- DHS S&T — *Computer Aided Dispatch Systems TechNote*
- Wikipedia — *Computer-Aided Dispatch*, *Ten-code*, *Incident Command System*, *NIMS*, *Medical Priority Dispatch System*
- APCO International — 10-code reference (copradar.com mirror); 2012 Plain Speech statement
- FEMA — NIMS Alert NA:023-06 (Dec 2006); NIMS Components
- CISA — *Plain Language FAQs* (June 2010)
- AHA — Chain of Survival
- Cummins et al. (1993) — *Predicting Survival from Out-of-Hospital Cardiac Arrest: A Graphic Model*, Annals Emerg Med (PMID 8214853)
- Frontiers Digital Health (2025) — *Timing is survival*
- AEDR Journal — EMD training and call-distribution studies
- IAED — Protocol 41 (Caller in Crisis); *Proceed With Caution*
- BJA — *Essential Elements of PMHC: Call-Taker and Dispatcher Protocols*
- BLS — *Public Safety Telecommunicators Occupational Outlook*
