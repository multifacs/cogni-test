# Plan 012: Save nback-stream exercise results to DB + show results page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3fc4a4f..HEAD -- src/lib/exercises/nback-stream/ src/lib/server/db/ src/lib/exercises/types.ts src/lib/exercises/index.ts src/routes/(app)/exercises/[slug]/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: Medium
- **Risk**: MED
- **Depends on**: Plan 009 (DONE)
- **Category**: tech-debt
- **Planned at**: commit `3fc4a4f`, 2026-06-14

## Why this matters

N-back stream is one of four exercises without result persistence. Users complete a 60-second cognitive challenge but lose all data on navigation. Adding persistence enables session history, trend tracking across sessions, and integration with the shared results page infrastructure. This exercise is unique among the four because it produces both a summary (`FullResult.summary`) and a detailed click log — we store only the summary per game session as a single flat row, matching the Approach A pattern (exclude complex arrays).

The risk is MEDIUM because `NBackStreamGame.svelte` uses Svelte 4 patterns (`createEventDispatcher`) that must be converted to callback props.

## Current state

### NBackStreamGame component

File: `src/lib/exercises/nback-stream/NBackStreamGame.svelte`

Uses Svelte 4 event dispatching:

```ts
import { createEventDispatcher } from "svelte";
const dispatch = createEventDispatcher<{ done: FullResult }>();
```

Dispatches at game end:
```ts
dispatch('done', res);
```

Also contains inline results display after game completion:
```svelte
{:else}
  <div class="p-6 space-y-4">
    <h2 class="text-xl font-semibold">Результаты</h2>
    <ResultsChart {clicks} />
    <!-- stat cards -->
  </div>
{/if}
```

### Types

File: `src/lib/exercises/nback-stream/types.ts`

```ts
export type FullResult = {
    domain: Domain;
    nBack: 1 | 2 | 3;
    target: TargetFeature;
    durationMs: number;
    clicks: ClickEvent[];
    totalStimuli: number;
    summary: {
        correct: number;
        incorrect: number;
        accuracy: number;
        avgRtMs: number | null;
        misses: number;
    };
};
```

`ClickEvent[]` is too complex for flat rows. We store only the summary metrics + config (domain, nBack, target) as a single attempt row per session.

### Playground

File: `src/lib/exercises/nback-stream/Playground.svelte`

Currently self-contained with inline display:

```svelte
<script lang="ts">
  import NBackStreamGame, { type FullResult } from "./NBackStreamGame.svelte";
  import ResultsChart from "./ResultsChart.svelte";

  let running = true;
  let final: FullResult | null = null;

  function handleDone(e: CustomEvent<FullResult>) {
    final = e.detail;
    running = false;
  }

  $: total = final?.clicks.length ?? 0;
  $: correct = final ? final.clicks.filter(c => c.isCorrect).length : 0;
  // ...
</script>

{#if running}
  <NBackStreamGame on:done={handleDone} />
{:else}
  <div class="p-6 space-y-6">
    <ResultsChart clicks={final?.clicks ?? []} />
    <!-- stat cards -->
  </div>
{/if}
```

Problems:
1. Uses `on:done` / `createEventDispatcher`
2. Uses `$:` reactive declarations
3. Has inline results display instead of delegating to Result.svelte
4. No DB writes at all currently

### Results adapter

File: `src/lib/exercises/nback-stream/results-adapter.ts`

Has `toDbAttempts()` mapping clicks to the test's schema format and `summary()` function. We'll write a simpler version for the exercise flow since we only need one summary row per session.

### ResultsChart

File: `src/lib/exercises/nback-stream/ResultsChart.svelte`

An SVG chart showing RT over time with correct/incorrect color coding. Takes `{clicks: ClickEvent[]}` prop via Svelte 4 `export let`. Will be reused inside Result.svelte.

### Design decisions for DB persistence

**Approach A (exclude complex fields):** Store a single summary row per completed game session. Fields: domain, nBack, target, durationMs, totalStimuli, correct, incorrect, accuracy (×1000), avgRtMs. The `clicks[]` array is excluded — if drill-down is needed later, it can be added via Approach B (JSON text column).

This is the right choice because:
- Summary tells the performance story at a glance
- `ResultsChart.svelte` needs `ClickEvent[]` data which we can't serve from flat summary rows — but the chart can show aggregate stats or we can add JSON column for clicks in a future iteration
- All other exercises use Approach A for their complex nested data

**Chart limitation:** Since we're storing only summaries without `clicks[]`, the existing `ResultsChart.svelte` (which requires `ClickEvent[]`) cannot be rendered from persisted data alone. The Result.svelte will therefore show stat cards only (Variant A), not the chart. A future plan can add a `clicksJson: text('clicks_json')` column to restore chart functionality.

### Conventions

Follow established patterns from plans 001–007. Exemplar files:
- Numbers: `src/lib/exercises/numbers/Playground.svelte`, `src/lib/exercises/numbers/Result.svelte`
- Card styling: `bg-[#364b6c] p-4 rounded-2xl text-center text-white`
- Svelte 5 runes only: no `createEventDispatcher`, no `$:`, no `export let`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Schema push | `npm run init-db-dev`   | exit 0              |
| Typecheck | `npm run check`          | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope**:
- `src/lib/server/db/models/exercises.ts` — add `nbackExerciseAttempt` table
- `src/lib/server/db/controllers/result.ts` — register new table
- `src/lib/exercises/types.ts` — add nback type entries
- `src/lib/exercises/nback-stream/types.ts` — add DB-safe summary export type
- `src/lib/exercises/nback-stream/NBackStreamGame.svelte` — convert to callback props, remove inline results
- `src/lib/exercises/nback-stream/Playground.svelte` — rewrite as thin forwarding wrapper
- `src/lib/exercises/nback-stream/Result.svelte` — create new file
- `src/lib/exercises/index.ts` — add `result` loader
- `src/routes/(app)/exercises/[slug]/playground/+server.ts` — add slug mapping
- `src/routes/(app)/exercises/[slug]/results/+page.server.ts` — add slug→type mapping

**Out of scope**:
- Any changes to test tables or test controller entries
- `src/lib/exercises/nback-stream/results-adapter.ts` — leave as-is
- `src/lib/exercises/nback-stream/ResultsChart.svelte` — not modified (can't render from summary-only data)
- Changes to other exercises or shared page shells

## Git workflow

- Branch: `advisor/012-nback-stream-save-results`
- Commit per step; message style: conventional commits
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add DB-safe summary type

In `src/lib/exercises/nback-stream/types.ts`, add at the bottom:

```ts
export type NBackSummaryRow = {
    domain: string;
    nBack: number;
    target: string;
    durationMs: number;
    totalStimuli: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    avgRtMs: number;
};
```

Note: Using primitive types (`string`, `number`) instead of union types (`Domain`, `TargetFeature`) for SQLite compatibility. Domain values are `'figures'` or `'numbers'`. Target values are `'shape'`, `'color'`, or `'number'`.

**Verify**: File saves without errors.

### Step 2: Add nbackExerciseAttempt table to DB models

Add after the last table definition in `src/lib/server/db/models/exercises.ts`:

```ts
export const nbackExerciseAttempt = sqliteTable('nback_exercise_attempt', {
    id: text('id').primaryKey().$defaultFn(generate),
    attempt: integer('attempt').default(1).notNull(),
    domain: text('domain').notNull(),
    nBack: integer('n_back').notNull(),
    target: text('target').notNull(),
    durationMs: integer('duration_ms').notNull(),
    totalStimuli: integer('total_stimuli').notNull(),
    correct: integer('correct').notNull(),
    incorrect: integer('incorrect').notNull(),
    accuracy: integer('accuracy').notNull(),
    avgRtMs: integer('avg_rt_ms').notNull(),
    sessionId: text('session_id')
        .notNull()
        .references(() => session.id),
    createdAt: text('created_at')
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
});
```

Notes:
- One row per completed game session (summary level)
- `accuracy` stored as integer (multiply float by 1000 for storage)
- `domain`: 'figures' or 'numbers'; `target`: 'shape', 'color', or 'number' — stored as text strings
- `avgRtMs`: 0 when there were no clicks (shouldn't happen normally)

**Verify**: File saves without errors.

### Step 3: Register in the result controller

In `src/lib/server/db/controllers/result.ts`:

1. Add import:
```ts
import { ..., nbackExerciseAttempt } from '$lib/server/db/models/exercises';
```

2. Add to BOTH maps with key `'nbackExercise'`:
```ts
const attemptTableMap = {
    // ...existing...
    nbackExercise: nbackExerciseAttempt
};

const queryTableMap = {
    // ...existing...
    nbackExercise: db.query.nbackExerciseAttempt
};
```

**Verify**: No TypeScript errors.

### Step 4: Extend TypeScript types

In `src/lib/exercises/types.ts`:

1. Import:
```ts
import type { NBackSummaryRow } from './nback-stream/types';
```

2. Add to `ExerciseType` union:
```ts
| 'nbackExercise'
```

3. Add to `ExerciseResultMap`:
```ts
nbackExercise: NBackSummaryRow;
```

4. Add to `ExerciseResult` and `ExerciseResults` unions:
```ts
// In ExerciseResult:
| NBackSummaryRow

// In ExerciseResults:
| NBackSummaryRow[]
```

**Verify**: `npm run check` passes.

### Step 5: Convert NBackStreamGame.svelte to use callback props

Update `src/lib/exercises/nback-stream/NBackStreamGame.svelte`.

Remove:
```ts
import { createEventDispatcher } from "svelte";
const dispatch = createEventDispatcher<{ done: FullResult }>();
```

Add props at top of script:
```ts
let {
    gameEnd,
    sendResults
}: {
    gameEnd: () => void;
    sendResults: (results: NBackSummaryRow[]) => void;
} = $props();
```

Import the summary type:
```ts
import type { NBackSummaryRow, FullResult } from "./types";
```

Replace dispatch call in `finish()`:
```ts
// OLD:
dispatch('done', res);

// NEW:
const summaryRow: NBackSummaryRow = {
    domain: res.domain,
    nBack: res.nBack,
    target: res.target,
    durationMs: res.durationMs,
    totalStimuli: res.totalStimuli,
    correct: res.summary.correct,
    incorrect: res.summary.incorrect,
    accuracy: Math.round(res.summary.accuracy * 1000),
    avgRtMs: res.summary.avgRtMs ?? 0
};
sendResults([summaryRow]);
gameEnd();
```

Remove the inline results display section (the entire `{:else}` block after `{:/if}` in the template). After calling `sendResults()` + `gameEnd()`, the route page redirects away, so no post-game UI is needed in the game component itself.

Keep all the game-running UI (`config`, `countdown`, `running` phases) unchanged.

**Verify**: `npm run check` passes.

### Step 6: Rewrite Playground.svelte as thin forwarding wrapper

Replace the entire content of `src/lib/exercises/nback-stream/Playground.svelte` with:

```svelte
<script lang="ts">
	import NBackStreamGame from './NBackStreamGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<NBackStreamGame {gameEnd} {sendResults} />
```

**Verify**: File compiles without errors.

### Step 7: Create Result.svelte (Variant A — stat cards only)

Create new file `src/lib/exercises/nback-stream/Result.svelte`:

```svelte
<script lang="ts">
	import type { NBackSummaryRow } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as NBackSummaryRow}
	<div class="grid grid-cols-3 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Верно</span>
			<strong class="text-2xl">{attempt.correct}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">% точности</span>
			<strong class="text-2xl">{(attempt.accuracy / 10).toFixed(1)}%</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Средний RT</span>
			<strong class="text-2xl">{attempt.avgRtMs} мс</strong>
		</div>
	</div>
	<div class="grid grid-cols-3 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">{attempt.nBack}-back</span>
			<strong class="text-2xl">{attempt.domain === 'figures' ? 'Фигуры' : 'Числа'}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Стимулов</span>
			<strong class="text-2xl">{attempt.totalStimuli}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Длительность</span>
			<strong class="text-2xl">{(attempt.durationMs / 1000).toFixed(0)} с</strong>
		</div>
	</div>
{/each}
```

Notes:
- Accuracy stored as integer ×1000, displayed by dividing by 10 to get percentage (e.g., 850 → 85.0%)
- Two rows of 3 cards each: primary metrics (correct, accuracy%, avg RT) and context metrics (nBack mode, total stimuli, duration)
- Uses standard card styling matching other exercises

**Verify**: File exists and imports resolve.

### Step 8: Register the result loader

In `src/lib/exercises/index.ts`, update the nback-stream entry in `exerciseLoaders`:

```ts
'nback-stream': {
    about: () => import('./nback-stream/About.svelte'),
    playground: () => import('./nback-stream/Playground.svelte'),
    result: () => import('./nback-stream/Result.svelte') // NEW
},
```

**Verify**: `npm run check` passes.

### Step 9: Update route handlers

**File**: `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Add slug mapping to `SLUG_TO_EXERCISE_TYPE`:
```ts
'nback-stream': 'nbackExercise',
```

**File**: `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Add mapping to `slugToExerciseType`:
```ts
'nback-stream': 'nbackExercise',
```

**Verify**: Both files save without errors.

### Step 10: Push schema changes and verify

```bash
npm run init-db-dev
```

Then verify:
```bash
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='nback_exercise_attempt';"
```

Run quality checks:
```bash
npm run check && npm run lint && npm run build
```

Manual E2E verification:
1. Navigate to `/exercises/nback-stream/about`
2. Start a game, play through to completion
3. Verify: POST `/exercises/nback-stream/playground` returns 201
4. Verify: page navigates to `/exercises/nback-stream/results`
5. Verify: results page shows accordion entry with 6 metric cards
6. Play again → second accordion entry appears

## Test plan

No automated tests exist for this flow currently. Manual E2E verification above covers the critical path.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] Table `nback_exercise_attempt` exists in the dev database
- [ ] `grep -r "createEventDispatcher" src/lib/exercises/nback-stream/NBackStreamGame.svelte` returns NO matches
- [ ] `grep -r "handleDone\|on:done" src/lib/exercises/nback-stream/Playground.svelte` returns NO matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- You discover that `nbackExerciseAttempt` already exists in `models/exercises.ts`.
- You discover that `NBackStreamGame.svelte` has been significantly restructured beyond dispatcher replacement.

## Maintenance notes

- The `results-adapter.ts` is left in place but unused by the new exercise flow. Remove it once confirmed no other code imports it.
- The ExerciseType key `'nbackExercise'` differs from URL slug `'nback-stream'` — handled by slug-to-type mappings.
- Accuracy is stored as integer ×1000 (e.g., 0.85 → 850). Display components must divide by 10 to get percentage (85.0%).
- The existing `ResultsChart.svelte` inside nback-stream requires `ClickEvent[]` data which isn't persisted. Future work could add a `clicksJson: text` column to store serialized click events, enabling the RT-over-time chart on the results page.
