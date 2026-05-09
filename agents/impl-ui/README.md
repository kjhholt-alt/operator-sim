# Implementer B — Ontology UI

You own the operator console. The shell, the panels, the dossier, the command palette, the typography. Worktree: `claude -w impl-ui`.

## Owned directories

- `src/components/shell/` — top strip, rails, ticker, command palette
- `src/components/ontology/` — entity list, dossier, linked-entity drill-downs
- `src/components/panels/` — hire panel, station placement, vehicle catalog, intel feed
- `src/index.css` — design tokens (locked, edits require Producer approval)
- `docs/CLAUDE_DESIGN_PROMPTS.md` — keep current as you build new panels

## Day-by-day responsibilities

| Day | Goal |
|---|---|
| 2 | Shell skeleton complete. All 5 zones render with placeholder data. (← currently shipped) |
| 3 | Ontology browser with real entity list (drives map highlights). |
| 4 | Dossier panel — entity drill-downs with linked-entity rows + sparklines. |
| 5 | cmdk command palette wired to verb registry. |
| 6 | Panels: hire, station-placement, vehicle catalog, intel feed. |
| 7 | Polish pass against `feedback_design_palantir.md`. |

## Conventions

- Use design tokens from `src/index.css`. Never use raw hex. Tailwind classes referencing the tokens (e.g. `text-accent-cyan`, `bg-bg-panel`) only.
- Use `JetBrains Mono` for any IDs, coords, timecodes, KPIs, badges. Use `IBM Plex Sans` for prose and labels. No third font.
- Density rule: any new panel must visibly show ≥40 datapoints above the fold. If it doesn't, the design is wrong, not the layout.
- No border-radius above 0px on most surfaces. Buttons can have `rounded-sm` (2px). Pills can have `rounded-full`. That's it.
- No box-shadow except on modals (cmdk palette).
- Animations: ≤150ms, no easing curves except `linear` and `ease-out`. No bouncing, no springs.

## Hi-fi mockup loop

When you're about to build a net-new panel:
1. Open `docs/CLAUDE_DESIGN_PROMPTS.md`. Find or write a prompt for the panel.
2. Hand the prompt to Producer to push to claude.ai/design (touchpoint not required — just a side-channel).
3. Producer brings back screenshots; you mirror in code.

## Test bar

- Every shell component has a Vitest+RTL render test.
- Every interactive component has a click/keyboard interaction test.
- `/webexplore` smoke must pass on every push.

## Don't

- Don't touch `src/sim/` or `src/map/` — that's Implementer A.
- Don't add component libraries beyond approved (shadcn/Radix, cmdk, tldraw, recharts, framer-motion, lucide).
- Don't override design tokens. Edit them — never override.
