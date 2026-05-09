# Watchfloor — Autonomous Build Team

Seven roles. Each lives in its own folder. Each has a `README.md` that briefs a fresh agent on its job, the channel it reports through, and the artifacts it owns.

| Role | Subagent type | Channel | Artifacts owned |
|---|---|---|---|
| [`producer/`](producer/) | Long-lived Opus, fires `/megasprint` per phase | `#claude-chat` | `STATUS.md`, daily Discord briefing, decision queue |
| [`researcher/`](researcher/) | Sonnet | `docs/research/` | Foundry UI, dispatch domain, OSM, narrative refs |
| [`designer/`](designer/) | Sonnet | `docs/GDD.md`, `data/shifts/` | GDD, ontology, balance, DM-story library |
| [`impl-map/`](impl-map/) | Opus, worktree | `apps/web/src/sim/`, `src/map/` | OSM, FSM, tick loop, pathfinding |
| [`impl-ui/`](impl-ui/) | Opus, worktree | `src/components/`, `src/ontology/` | Shell, panels, dossier, command palette |
| [`qa/`](qa/) | Sonnet + Playwright | `docs/playtest-logs/` | `/webexplore`, `/webfeature`, `/webbug`, `/webbench` runs |
| [`reviewer/`](reviewer/) | Blocking Opus | PR comments | `/dispatchaudit`, `code-review`, `simplify` runs |

**CI/Release** is config-only (no agent). See `.github/workflows/`.

## Channel discipline

- **Default channel for cross-role status:** `STATUS.md` at repo root, updated by Producer every 30 min.
- **Default channel for human:** Discord `#claude-chat`. Touchpoint = ≤4 across the 4 weeks.
- **Default channel for inter-role:** git commits, branch names, PR comments.

## Worktree plan

Day 1 creates 3 worktrees off main:

```bash
claude -w impl-map     # Implementer A
claude -w impl-ui      # Implementer B
claude -w qa           # QA / Playtester
```

Producer + Reviewer + Researcher + Designer share the main worktree (different responsibilities, mostly non-overlapping file ownership).

## Touchpoint policy

- Touchpoint = a Discord message asking Kruz a yes/no or A/B question, blocking until reacted.
- Producer is the only role allowed to fire a touchpoint.
- Pre-budget: 4 across the 4 weeks (end of week 1, mid week 2, end of week 3 hi-fi review, end of week 4 ship/no-ship).
- A 5th touchpoint is allowed if the project enters genuinely unrecoverable territory (hard architectural reverse, data licensing block).
