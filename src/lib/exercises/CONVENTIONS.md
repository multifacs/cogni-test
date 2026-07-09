# Exercise Conventions

## Result.svelte — Single-Session Display Only

Every exercise's `Result.svelte` receives **one session's worth of attempts** via the `results` prop (`ExerciseResults`). It must **not** iterate over sessions or build its own list — that is the route's job.

### Architecture

```
src/routes/(app)/exercises/[slug]/results/+page.svelte
  → Groups results by session (accordion list)
  → Each expanded section renders the exercise's Result component:
     <Comp exerciseType={slug} results={result.attempts} meta={...} />

src/lib/exercises/<exercise>/Result.svelte
  → Displays ONE session's attempts
  → Props: { results: ExerciseResults, exerciseType?: string, meta?: string[] }
  → Must be compact and responsive
```

The route page (`+page.svelte`) handles:
- Fetching all sessions from the server
- Grouping by `sessionId` / `createdAt`
- Accordion UI with expand/collapse
- Loading the correct `Result.svelte` via `exerciseRegistry[slug].result()`
- Passing `results={result.attempts}` and `meta` to the component

The `Result.svelte` component handles:
- Rendering the data for **one session only**
- Responsive layout (mobile-first with `sm:` breakpoints)
- Deduplicating shared header info (e.g. if all rows share the same category/duration, show it once)

### Comparison with Tests

The same pattern exists for tests at `src/lib/tests/`:

```
src/routes/(app)/tests/[slug]/results/+page.svelte
  → Same accordion pattern, passes results to ResultsChart

src/lib/tests/<test>/ResultsChart.svelte
  → Displays ONE session's results
  → Props: { testType: keyof TestResultMap, results: ResultType[] }
  → Uses Chart.js for visualization
```

The test results page is a good reference implementation — see `src/routes/(app)/tests/[slug]/results/+page.svelte` and `src/lib/tests/math/ResultsChart.svelte`.

### Common Mistakes

1. **Iterating over sessions in Result.svelte** — The route already handles session grouping. Your `Result.svelte` receives `result.attempts` for one session, not all sessions.

2. **Repeating shared data per attempt** — If every row in the session shares the same category, duration, etc., show it once in a summary header instead of repeating it N times (see word-morphing refactor).

3. **Full-width cards per attempt** — Use compact layouts (tables, grids) instead of stacking full-width cards vertically. Mobile users will thank you.

4. **Not using responsive breakpoints** — Always add `sm:` variants for padding, gaps, and font sizes.

## File Structure

Every exercise should follow this layout:

```
src/lib/exercises/<exercise>/
  About.svelte          — Description / instructions
  Playground.svelte    — The interactive exercise
  Result.svelte        — Single-session results display
  types/index.ts        — Type definitions
  logic/               — Game logic, data, helpers
  components/          — Sub-components used by Playground
```

## Registration

Register the exercise in two places:

1. `src/lib/exercises/index.ts` — Add to `exercises` array and `exerciseLoaders` record
2. `src/lib/exercises/types.ts` — Add to `ExerciseType`, `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

The `result` loader key is optional — if omitted, the results page will use a fallback chart.

## Per-Trial vs Per-Session DB Schema

Most exercises store **one row per attempt/stage** in their attempt table (e.g. each word-morphing combo, each raven question, each emoji trial). Each row has a `session_id` FK linking it to the `session` table. Summary metrics (accuracy, average time, etc.) are **derived at read time** by the `results-adapter.ts` + `Result.svelte` — never stored as columns.

A few older exercises (attention, flanker, letters, numbers, pictures) still use a per-session row with aggregate columns (`score`, `mistakes`, `accuracy`, etc.). New exercises should **not** follow this pattern — use per-trial rows instead.

### Per-Trial Pattern (preferred)

Used by: `raven-matrices`, `emoji`, `campimetry`, `word-morphing`, `memory-match`, `nback-stream`

- DB table: one row = one user action/answer
- `orderByMap` uses the trial index column (e.g. `asc(f.taskIndex)`, `asc(f.trialIndex)`, `asc(f.comboIndex)`)
- `results-adapter.ts` provides `summary()` to derive aggregates
- `Result.svelte` shows summary header + `<ResultsChart>` chart
- `ResultsChart.svelte` renders a Chart.js line chart with per-trial dots (green=correct, red=error)

### Per-Session Pattern (legacy)

Used by: `attention`, `flanker`, `letters`, `numbers`, `pictures`

- DB table: one row = entire session summary
- `orderByMap` uses `asc(f.attempt)` (1-based attempt number)
- No `results-adapter.ts`, no `ResultsChart.svelte`
