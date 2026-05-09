---
summary: Treat each shift as a Blades-in-the-Dark "score" lit by Apocalypse-World "fronts" — incidents are surface beats, threads are the slow burn, and the DM (Sonnet) plants 2-3 hooks per shift that pay off across a 5-7 shift career arc. Ship YAML matching GDD §6 via a structured prompt that takes recent shifts as memory and emits at most 1-2 active threads per shift to dodge the "everything is connected" Wildermyth failure mode.
actionable_for: [designer]
sources: 19
written: 2026-05-09
---

# Operator Sim — Narrative shift design dossier

The pillar is "DM-driven narrative shifts" (GDD §2 pillar 3, §6). The risk is that procedural content reads as random noise and scripted content collapses replay value. This dossier pulls the structural patterns from tabletop RPG design and procedural-narrative games, adapts them to an 8-12 game-min operator-sim shift, and ends with a copy-paste-ready prompt scaffold for the Designer agent.

---

## 1. Tabletop RPG DM patterns

These are the patterns that work across decades of play and dozens of systems. Pull the structure, not the genre.

### Apocalypse World — "Fronts" and "Threats Clock" (Vincent Baker, 2010)

A **front** is a problem advancing on the players whether or not they engage with it. Each front contains 2-4 **threats** (an NPC, a faction, a location, a phenomenon), each with a **clock** ticking from `0:00` (introduced) → `12:00` (catastrophe). On a "soft move" (player rolls a partial success or doesn't react fast enough), the DM ticks the clock forward.

For Operator Sim: a front is a **slow-burn condition** in the city — "rising elderly-isolation cluster on Brady Street", "meth lab somewhere on the west side of Rock Island", "dispatcher Diaz is burning out". Each ticks across multiple shifts. Incidents are how the front pokes through.

Reference: *Apocalypse World*, Lumpley Games, 2nd ed.; pages 138-153 on fronts.

### Blades in the Dark — "Scores" and "Faction Clocks" (John Harper, 2017)

Each session is a **score** — a defined operation with a target, a plan, and predictable beats. Scores happen against a backdrop of **factions** with their own goals and clocks running outside the player's view. Replay value is high because the score structure is consistent (good for the player) but the faction matrix is dynamic (good for the world).

For Operator Sim: a shift IS a score. The "score" is "make it through 8-12 game minutes and resolve the planned incidents". The faction layer (slumlord, opioid dealer, hospital staffing crisis, weather) ticks underneath. Players never directly touch the faction sheet but they feel its weather.

Reference: *Blades in the Dark*, Evil Hat, ch. 6 "The Score" + ch. 7 "Factions".

### Dungeon World — "Soft moves / hard moves" (Sage LaTorra, Adam Koebel, 2012)

A **soft move** sets up consequence ("the goblin readies an arrow"); a **hard move** delivers it ("the arrow hits"). The DM only escalates to a hard move on a player miss or after a soft-move warning was ignored.

For Operator Sim: this is the framework for **incident escalation**. A soft move is "fire incident pre-arrival call from a worried neighbor — smoke smell". A hard move is "second-floor flashover, the structure is going". The dispatcher's response to soft moves determines whether the hard move fires.

Reference: *Dungeon World*, Sage Kobold; "GM's principles" + "GM moves" pages.

### Worlds Without Number — "Sandbox tools" (Kevin Crawford, 2020)

Crawford's procedural-tools library — random tables for rumors, regions, factions, NPCs, conspiracies. The point is **lots of small, semantically tagged generators** that combine to feel curated rather than one big generator that feels procedural.

For Operator Sim: don't write one mega-prompt for "generate a shift". Write 8-12 small generators (`generate_caller_persona`, `generate_address_drama`, `generate_weather_pressure`, `generate_BOLO`) and have the orchestrator compose them. This is also an LLM win — small focused prompts are more reliable than one giant one.

Reference: *Worlds Without Number*, Sine Nomine Publishing, free PDF version.

---

## 2. Procedural narrative in games

| Game | Pattern | What works | What fails |
|---|---|---|---|
| **Wildermyth** | Anchored event chains. Each character has tagged history events that feed forward into later procedural prompts. | Characters feel like protagonists; replay produces wildly different stories. | "Everything is connected" — by hour 5 every event references some prior event, and the player stops caring because the connection density is uniform. |
| **Dwarf Fortress** | History generator runs centuries before play. Events are strict cause-effect chains, surfaced via the in-game Legends viewer. | Astonishing depth on inspection. | Almost none of it surfaces during play; players need an out-of-game tool. |
| **Crusader Kings 3** | Event scripting language (decisions + triggers + outcomes), with prerequisite chains and deferred fire-times. | Strong flavor moments; the "haunted by your dead lover" chain etc. | Random fire-time means you see the same event 4 times in 200 hours; ages poorly. |
| **Frost Punk** | Book-of-Laws — branching policy tree where past laws constrain future ones. Players' choices commit them to a moral arc. | Player feels their *city* has a personality. | Linear; second playthrough you remember every law. |
| **RimWorld** | Storyteller AI ("Cassandra Classic") paces threats based on player wealth and history. | Pacing feels human; no two playthroughs are identical. | Threats can feel arbitrary; the AI is invisible to the player so it never feels "earned". |
| **Disco Elysium** | Hand-authored thoughts cabinet that responds to play history. | Best-in-class branching narrative. | Not procedural — every word is hand-written. Cannot scale. |

**The pattern that wins in practice:** *small number of hand-authored arc skeletons* (5-15) × *procedural NPCs/incidents/details that fill the slots*. Wildermyth's failure mode is too many simultaneously active arcs; Frost Punk's success is one arc per playthrough done deeply. Operator Sim should default to **1 active narrative thread per shift, occasionally 2, never 3+**.

---

## 3. Hooks and threads — how DMs tie a session together

### The Three-Clue Rule (Justin Alexander, "The Alexandrian", 2008)

For any conclusion the DM needs the players to reach, plant **at least three clues**, because two will be missed and one will be misinterpreted. ([thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule](https://thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule))

For Operator Sim: if a thread is "the elderly-isolation cluster on Brady Street pays off as a welfare-check that prevents a cardiac arrest", the DM should plant:

1. A medical-low-priority shift earlier ("Margaret K., 67, fell in the kitchen, refused transport").
2. A neighbor's noise complaint mentioning "her dog won't stop barking" — a soft tell.
3. An intel feed item: "3 elderly-checkin calls in a 4-block radius this week — community-services flag?"

If the player notices any one, they get the cardiac shift's "pre-arrival ALS prep" bonus. If they notice all three, they get a small XP narrative reward and the thread closes with a satisfying NPC moment ("Lt. Diaz: 'we got there fast because you flagged Brady Street earlier'").

### Foreshadowing and returning NPCs

Standard procedural drama technique: a character introduced in shift N becomes a caller in shift N+2 or a victim in shift N+5. Operator Sim's `Caller` and `Address` are first-class entities (GDD §5) — perfect substrate for this. The Designer agent should be encouraged to **reuse caller names and addresses** from prior shifts when generating a new shift.

### Patterns recognized only on second play

The Wire and Disco Elysium both bury references to the ending in the opening hours. Operator Sim's analog: a name in a BOLO at shift 3 becomes a suspect at shift 8. The player who replays a campaign sees it; the first-time player doesn't notice. This is **free narrative depth** as long as the Designer agent has access to "future shift drafts" when authoring earlier ones — i.e., generate the campaign arc first, then individual shifts.

Reference: Robin Laws, *Hamlet's Hit Points* — a structural toolkit for narrative beats.

---

## 4. Police-procedural drama structure

| Show | Arc unit | Why it works | Operator Sim analog |
|---|---|---|---|
| **The Wire** | Season-long (10-13 episodes) | Slow-build institutional drama; payoffs across 30+ hrs of TV. | A **career arc** (5-7 shifts at a tier) plays here. |
| **Brooklyn Nine-Nine** | Episode-of-the-week + season B-plot (relationship arcs) | Low-stakes joy per episode, B-plot for replay. | Each shift has its score (A-plot) + 1 personnel/relationship beat (B-plot). |
| **Third Watch** | Episode-of-the-week with character continuity | Caller and address reuse across episodes. | Direct match. The closest TV ancestor for our format. |
| **9-1-1 (Fox)** | Episode-of-the-week, multiple intercut incidents per ep | 911-call structure; 4-6 incidents per ep, often loosely thematically linked (heat wave, eclipse, blackout). | Direct match. Best reference for "shift with multiple incidents linked by a slow theme". |
| **The Shield** | Season arc, hard episode endings | Each ep escalates a pot that boils across season. | The "front" (Apocalypse World) — a slow-burn problem with shift-by-shift escalation. |

**The right unit for Operator Sim is the shift (8-12 min) for self-contained beats, and the career arc (5-7 shifts) for slow-burn fronts.** That mirrors *9-1-1* and *Third Watch* almost exactly. Avoid The Wire scope on v0.1 — too long for a self-contained game session.

---

## 5. Apply to dispatch — what can plausibly thread

Concrete narrative threadable items at our scale:

| Threadable | Mechanism | Example |
|---|---|---|
| **Repeat caller** | Reuse `Caller` entity across shifts | Margaret K. calls in 3 shifts; the 3rd is the cardiac. |
| **Repeat address** | Reuse `Address` entity | The same Brady St building has 4 incidents in a month. |
| **BOLO match** | Suspect description from shift 3 matches caller persona shift 8 | Player connects the dots in their head. |
| **Weather pressure** | Slow-burn city-state condition that primes risk types | Dry windy week → fire incidents up; the player should notice. |
| **Personnel arc** | A firefighter introduced shift 1 has a B-plot (rookie, retiring, romantic, mistake) | Crosses 5+ shifts. |
| **Faction simmering** | Off-screen faction (gang, slumlord, hospital admin) does things between shifts | Surfaces as intel feed items, occasional incident. |
| **Calendar pressure** | Holidays, sports-game days, school breaks affect call mix | "Friday night football → traffic incidents, fights" |
| **Recent-shift continuity** | Last shift's unresolved/escalated incident becomes shift opening briefing | "Shift 7 brief: Margaret K. transport from last shift — patient stable, daughter requested follow-up" |

**Hard rule for Designer agent:** at most 1-2 of these are *active* threads in any given shift. The rest are background flavor. If you try to weave 5 threads into a 10-minute shift the player feels overloaded and nothing lands.

---

## 6. Generation pipeline

Per GDD §6 the Designer agent (Sonnet) emits YAML conforming to `src/lib/schemas.ts` Zod schema. Pipeline:

```
[recent shifts (last 3)]    [career-arc state]    [unlocked tier]
              \                    |                   /
               \___________________V__________________/
                              |
                       Designer prompt
                              |
                              V
                       Claude Sonnet
                              |
                              V
                          YAML doc
                              |
                              V
                    Zod validation (schemas.ts)
                              |
                       pass / fail
                       /         \
                  commit          regenerate (max 2 retries)
                  to data/shifts/
```

**What goes in the prompt:**

1. **Recent shifts** — IDs, narrative_threads, and resolutions of the last 3 shifts. Lets the agent reuse entities and tick fronts forward.
2. **Career-arc state** — current open fronts (Apocalypse-World style), each with clock position, planted clues so far, and time-to-payoff.
3. **Difficulty tier** — Tier 1-5 from GDD §4. Affects incident density, types unlocked, and chaos pacing.
4. **Available units** — what's on the floor (E1, M2, etc.). Keeps the shift solvable.
5. **Time of day** — affects call mix (3 AM has different texture than 5 PM).
6. **Weather + calendar** — slow-burn flavor pressure.
7. **Schema reminder** — paste the Zod schema directly, plus 1-2 hand-authored gold-standard examples.

The Designer agent then emits:
- `id`, `date`, `narrative_threads[]`, `incidents[]`, `intel[]`
- 1-2 narrative threads, each with arc text and incident IDs
- 4-8 incidents per shift (Tier 1) up to 12-18 (Tier 5)
- 0-3 intel items per shift
- Optional: `b_plot` field for personnel/relationship beats

**Validation:** Zod catches schema errors; semantic validation (does the address exist? does the unit type match the incident type?) is a second pass via a small TypeScript validator before commit. On semantic failure, send the validator error back to the model and ask for a corrected emit (max 2 retries, then human review).

---

## 7. Failure modes to avoid

These are the red flags pulled from the procedural-narrative literature and game post-mortems:

1. **Over-connection** (Wildermyth-style). Every shift references every prior shift. Solution: hard-cap active threads at 1-2 per shift; idle threads should be visible only via the intel feed, not via the active incidents.
2. **Random-feeling spawns** (RimWorld at low Cassandra setting). Player can't model what's coming. Solution: telegraph via intel/weather one shift in advance; never first-fire a major incident with zero foreshadowing.
3. **Scripted-feeling rails** (Frost Punk on replay). Player remembers exactly what happens. Solution: keep the *skeleton* of arcs hand-authored but the *details* (caller names, addresses, exact wording) procedurally varied per playthrough.
4. **Density miscalibration** (CK3's repetitive event firings). Same event type repeats. Solution: track event-type cooldowns per career; the Designer agent receives "incident types used in last 3 shifts: [...]; deprioritize repeating".
5. **No stakes between shifts** (911 Operator). Each shift is fully self-contained, so player has no investment. Solution: the open-threads-carry-forward mechanic in GDD §3 core loop is exactly the antidote — make sure unresolved threads visibly persist on the briefing screen.
6. **NPC churn** (Dwarf Fortress legend wall, also Disco Elysium minor characters). Names blur. Solution: ≤4 named recurring NPCs per career-arc segment. Anyone else is a one-shot or visible only as `Caller`/`Address` first-class entity.
7. **DM-prose tonal drift** (any LLM). Sonnet writing stylized florid prose where the player wants curt CAD-style text. Solution: pin tone in the system prompt with examples; reject outputs that read like fanfiction.
8. **No "felt-curated" moment** (this is the headline failure). Player goes 5 shifts and never feels a payoff. Solution: every career-arc skeleton has a planned payoff shift (typically shift 5 of a 5-7 shift arc), and the Designer agent knows it. The prompt for that shift specifically asks for the payoff scene.

---

## Concrete prompt scaffold for Designer agent

Drop this into `agents/designer/prompts/shift-dm.md`. Designer can refine on Day 1.

```text
SYSTEM:

You are the Operator Sim Designer — a procedural narrative DM in the lineage of
Apocalypse World, Blades in the Dark, and police-procedural showrunners
(9-1-1, Third Watch, The Wire). You generate a shift document for a
dispatch sim set in a real OSM hometown.

Your job: emit ONE shift as YAML, conforming to the schema below. The shift
should feel handwritten — small in scope, sharp in detail, threaded to
prior shifts but not overloaded. Real CAD-radio terseness, not fanfiction
prose.

DESIGN PRINCIPLES (read every time):
- One active narrative thread per shift, occasionally two, never three.
- Every incident has a real OSM address from the addresses pool I provide.
- Reuse caller names and addresses from prior shifts when natural; do not
  force connections.
- Telegraph hard moves with soft moves at least one shift in advance.
- Tone: dispatcher CAD-text. "Caller reports smoke 2nd flr." not
  "Plumes of grey smoke billowed against the autumn sky."
- Cooldown: do not repeat incident types that fired in the last 3 shifts
  unless arc demands it.

CONTEXT YOU RECEIVE:
- recent_shifts (last 3 shifts: ids, narrative_threads, incident summaries,
  resolutions)
- career_arc (open fronts with clock positions and planted clues)
- difficulty_tier (1-5; see tier rubric)
- available_units (units currently on the floor)
- time_of_day (HH:MM 24h)
- weather (current + 12h forecast)
- calendar_context (day of week, holidays, sports/school)
- addresses_pool (sample of 200 real addresses from the city)
- previous_callers (names from last 5 shifts that may recur)
- schema (Zod schema for the YAML output)
- examples (2 gold-standard shift YAMLs)

YOUR OUTPUT IS YAML AND ONLY YAML. No prose preamble. No code fences.
Start at `id:` and end at the last list item.

USER:

Generate shift {{shift_id}} for {{date}}.

Tier: {{tier}} ({{tier_rubric}})
Time of day: {{time}}
Weather: {{weather_summary}}
Calendar: {{calendar_context}}

Recent shifts (newest first):
{{#each recent_shifts}}
- {{id}} ({{date}}): {{summary}}
  threads: {{threads_summary}}
  unresolved: {{unresolved_summary}}
{{/each}}

Open fronts:
{{#each open_fronts}}
- {{id}}: {{description}} (clock {{clock}}/{{clock_max}}, planted {{planted_count}} clues)
{{/each}}

Available units: {{available_units}}

Recurring callers worth considering: {{previous_callers}}

Address pool (sample): {{addresses_sample}}

Schema (output MUST validate):
{{schema}}

Two gold-standard examples:
{{example_1}}
{{example_2}}

Emit shift YAML now.
```

**Concrete sizing for Designer's first 30-shift seed batch (Week 1):**

- 6 shifts at Tier 1 (Watchstander) — 4-6 incidents each, 1 thread, fire-only.
- 8 shifts at Tier 2 — 6-8 incidents, 1-2 threads, fire + EMS.
- 8 shifts at Tier 3 — 8-10 incidents, 1-2 threads, fire + EMS + police.
- 5 shifts at Tier 4 — 10-12 incidents, 2 threads, full agency mix.
- 3 shifts at Tier 5 — 12-18 incidents, mass-casualty single-thread.

Group into 4 career arcs of 5-7 shifts each, plus 2 standalones. Each arc has a stated payoff shift; the Designer is told which shift is the payoff when generating that one.

---

## References

- Vincent Baker, *Apocalypse World* 2nd ed., Lumpley Games — fronts, threats clocks, soft/hard moves.
- John Harper, *Blades in the Dark*, Evil Hat — score structure, faction clocks. https://bladesinthedark.com/
- Sage LaTorra & Adam Koebel, *Dungeon World* — GM principles. https://dungeon-world.com/
- Kevin Crawford, *Worlds Without Number*, Sine Nomine — sandbox tools. https://www.drivethrurpg.com/product/348809
- Justin Alexander, "The Three Clue Rule", The Alexandrian (2008). https://thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule
- Robin Laws, *Hamlet's Hit Points*, Gameplaywright — narrative beat analysis.
- Wildermyth design notes — Worldwalker Games dev blog. https://wildermyth.com/wiki/Storytelling
- Tarn Adams, "Dwarf Fortress: A History Generator", GDC 2017. https://www.youtube.com/watch?v=VAhHkJQ3KgY
- Crusader Kings 3 modding wiki, "events" reference. https://ck3.paradoxwikis.com/Event_modding
- Frost Punk Book of Laws design retrospective — 11 Bit Studios GDC 2019. https://www.gdcvault.com/play/1025862/
- RimWorld storyteller design — Tynan Sylvester, "Designing Games" (2013), ch. 16.
- Disco Elysium thought cabinet design — Robert Kurvitz interviews, RPS 2019. https://www.rockpapershotgun.com/disco-elysium-interview
- David Simon, *The Wire* writers' room interviews — *Truth Be Told* (2009).
- *9-1-1* showrunner Tim Minear interviews on episodic structure — Variety 2018-2024.
- *Third Watch* episode database — TV Tropes structural notes. https://tvtropes.org/pmwiki/pmwiki.php/Series/ThirdWatch
- *911 Operator* (Jutsu Games, 2017) — counter-example for shift-only-no-arc design.
- Cassandra Classic AI walkthrough — RimWorld wiki. https://rimworldwiki.com/wiki/Storyteller
- Operator Sim GDD §6 — local source of truth for the YAML schema.
- Anthropic prompt-engineering best practices — https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering
