# Plans Index

Generated: 2026-06-14
Base commit: `3fc4a4f`

## Active Plans

| # | Plan | Status | Effort | Depends on |
|---|------|--------|--------|------------|
| 001 | [Save attention exercise results to DB + show history](./001-attention-save-results.md) | DONE | Medium | — |
| 002 | [Save emoji exercise results to DB + show "Результаты"](./002-emoji-save-results.md) | DONE | Medium | Plan 001 |
| 003 | [Save flanker exercise results to DB + add Result page](./003-flanker-save-results.md) | DONE | Medium | Plan 001 |
| 004 | [Save letters exercise results to DB + add Result page](./004-letters-save-results.md) | DONE | Medium | Plan 001 |
| 005 | [Save numbers exercise results to DB + add "Результаты" button/page](./005-numbers-save-results.md) | DONE | Medium | Plan 001 |
| 006 | [Save raven matrices exercise results to DB + add Result page](./006-raven-matrices-save-results.md) | DONE | Medium-Large | Plan 001 |
| 007 | [Save pictures exercise results to DB + add "Результаты" button/page](./007-pictures-save-results.md) | DONE | Medium | Plan 001 |
| 008 | [Show exercise session counts on exercises listing page](./008-exercise-session-counts.md) | DONE | Small | Plans 001–007 |
| 009 | [Generic Exercise Results Page for Future Exercises](./009-exercise-results-page.md) | DONE | Medium | Plans 001–007 |
| 010 | [Save campimetry exercise results to DB + show results page](./010-campimetry-save-results.md) | DONE | Medium | Plan 009 |
| 011 | [Save memory-match exercise results to DB + show results page](./011-memory-match-save-results.md) | DONE | Medium | Plan 009 |
| 012 | [Save nback-stream exercise results to DB + show results page](./012-nback-stream-save-results.md) | DONE | Medium | Plan 009 |
| 013 | [Save word-morphing exercise results to DB + show results page](./013-word-morphing-save-results.md) | DONE | Medium-Large | Plan 009 |
| 014 | [Enrich word-morphing result data and improve result display](./014%20Enrich%20word-morphing%20result%20data%20and%20improve%20result%20display.md) | DONE | Medium | Plan 013 |
| 015 | [Migrate flanker to per-trial DB schema](./015-flanker-per-trial.md) | DONE | Medium | — |
| 016 | [Migrate letters to per-trial DB schema](./016-letters-per-trial.md) | DONE | Medium | — |
| 017 | [Migrate numbers to per-trial DB schema](./017-numbers-per-trial.md) | TODO | Medium | — |
| 018 | [Migrate pictures to per-trial DB schema](./018-pictures-per-trial.md) | TODO | Medium | — |
| 019 | [Migrate attention to per-trial DB schema](./019-attention-per-trial.md) | TODO | Medium | — |
| 020 | [Migrate nback-stream to per-trial DB schema](./020-nback-per-trial.md) | TODO | Medium | — |

## Sprint: Exercise Results Persistence

Plans 010–013 form a sprint to add result persistence for the four remaining exercises without it. All depend on the shared infrastructure documented in Plan 009.

### Recommended execution order

1. **Plan 010** (campimetry) — lowest risk; test-side DB table already exists as reference
2. **Plan 011** (memory-match) — medium risk; must convert Svelte 4 dispatcher pattern
3. **Plan 012** (nback-stream) — medium risk; also needs Svelte 4 conversion; chart won't render from summary-only data (acceptable MVP trade-off)
4. **Plan 013** (word-morphing) — highest risk; Playground IS the game (no separate component), multi-phase with localforage/push notifications

### Key differences between exercises

| Exercise | Has separate Game component? | Uses createEventDispatcher? | Existing types.ts? | Test DB table? | Chart reuse? |
|----------|------------------------------|----------------------------|---------------------|----------------|--------------|
| Campimetry | No (logic in class) | No | Yes | Yes (`campimetry_attempt`) | Variant B: reuse test's ResultsChart |
| Memory-match | Yes (`MemoryMatchGame.svelte`) | Yes | Yes (`FullResult`) | Yes (`memory_match_attempt`) | Variant B: own ResultsChart |
| N-back stream | Yes (`NBackStreamGame.svelte`) | Yes | Yes (`FullResult`) | No | Variant A only (summary can't feed chart) |
| Word-morphing | No (all in Playground) | No | Yes (`WordMorphingResult`) | No | Variant A: stat cards only |

### Shared infrastructure changes

All four plans touch these shared files. Execute sequentially or merge carefully:

- `src/lib/server/db/models/exercises.ts` — each plan adds one table
- `src/lib/server/db/controllers/result.ts` — each plan adds two map entries
- `src/lib/exercises/types.ts` — each plan adds type imports + union members
- `src/lib/exercises/index.ts` — each plan adds a `result` loader
- `src/routes/(app)/exercises/[slug]/playground/+server.ts` — each plan adds slug mapping
- `src/routes/(app)/exercises/[slug]/results/+page.server.ts` — each plan adds slug mapping

If executing plans in parallel, be aware of merge conflicts in these files.

### Dependency notes

- All four plans depend on Plan 009 (reference guide), which is documentation only and is already written.
- The four plans are independent of each other but share the files listed above.
- If Plans 010+ are executed after all four land, run `npm run init-db-dev` once rather than per-plan.

## Sprint: Per-Trial Schema Migration

Plans 015–020 migrate the 6 exercises that use per-session aggregate DB rows to the per-trial pattern established by raven-matrices, emoji, and word-morphing. The DB can be dropped since this is a dev environment.

### Recommended execution order

1. **Plan 015** (flanker) — richest discarded data (`answerLog` with per-trial RT, congruent flag); most impactful migration
2. **Plan 016** (letters) — similar pattern to flanker; discards `answerLog` with per-round detail
3. **Plan 017** (numbers) — already sends per-level data (`reviews` array) that gets silently dropped; also adds proper `reactionTimeMs` tracking (currently always 0)
4. **Plan 018** (pictures) — already sends per-question data (`answers` array) that gets silently dropped; easiest migration since data flow already exists
5. **Plan 020** (nback-stream) — collects rich `ClickEvent[]` but sends aggregate; existing `ResultsChart.svelte` (raw SVG) never renders from DB data; also upgrades chart to Chart.js + Svelte 5
6. **Plan 019** (attention) — hardest migration; no per-click data currently tracked, must add click logging to game logic

### Shared infrastructure changes

All 6 plans touch these shared files. Execute sequentially or merge carefully:

- `src/lib/server/db/models/exercises.ts` — each plan replaces one table definition
- `src/lib/server/db/controllers/result.ts` — each plan updates one `orderByMap` entry
- `src/lib/exercises/types.ts` — each plan updates one type import + union members

If executing plans in parallel, be aware of merge conflicts in these files. After all 6 land, run `rm sqlite.db sqlite.db-shm sqlite.db-wal && npm run init-db-dev` once.

### Dependency notes

- All 6 plans are independent of each other (they modify different exercise directories).
- They share the 3 files listed above, so they must be merged carefully if executed in parallel.
- None depend on prior plans (001–014 are all DONE).

## Previous Execution Order

1. ~~**Plan 001**~~ — Done.
2. ~~**Plan 002**~~ — Done (depended on 001).
3. ~~**Plan 003**~~ — Done (depended on 001). Executed at `251f283`.
4. ~~**Plan 004**~~ — Done (depended on 001). Executed at `b200332`. Steps 3 & 7 skipped (already done by prior plans).
5. ~~**Plan 005**~~ — Done (depended on 001). Executed at `a46b462`. Steps 3 & 7 skipped (already done by prior plans).
6. ~~**Plan 006**~~ — Done (depended on 001). Executed at `1b4dba1`. Step 3 skipped (types already configured); minor out-of-scope NumbersGame fix included.
7. ~~**Plan 007**~~ — Done (depended on 001). Executed at `6014494`.
8. ~~**Plan 008**~~ — Done. Executed at `3d48f33`.

## Considered and Rejected

(none yet)
