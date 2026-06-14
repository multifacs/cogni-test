# Plan 011: Save memory-match exercise results to DB + show results page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3fc4a4f..HEAD -- src/lib/exercises/memory-match/ src/lib/server/db/ src/lib/exercises/types.ts src/lib/exercises/index.ts src/routes/(app)/exercises/[slug]/`
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

Memory-match is one of four exercises without result persistence. The game already has types defined (`FullResult`), a `results-adapter.ts`, an inline `ResultsChart.svelte`, and even posts to `/tests/memoryMatch/playground`. But it saves to the test DB table under the test path — results are invisible on the exercise results page. This plan makes memory-match follow the same pattern as all other exercises: `gameEnd`/`sendResults` props → POST to exercise route → per-session accordion display.

The risk is MEDIUM because memory-match currently uses Svelte 4 patterns (`createEventDispatcher`, `$:`) and sends data directly via `fetch()` from inside Playground. This must be refactored to match the Svelte 5 callback-props pattern.

## Current state

### Memory-match game component

File: `src/lib/exercises/memory-match/MemoryMatchGame.svelte`

Uses Svelte 4 event dispatching:

```ts
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher<{ done: FullResult }>();
```

Dispatches at end of game:
```ts
dispatch('done', { perStage, totalDurationMs, totalFlips, totalMistakes, seed });
```

Has its own local `FullResult` type (different from the one in `types.ts`):

```ts
export interface FullResult {
    perStage: StageResult[];
    totalDurationMs: number;
    totalFlips: number;
    totalMistakes: number;
    seed: string;
}
```

Also uses `$:` reactive declaration:
```ts
$: grid = stages[currentStageIndex]
    ? `repeat(${stages[currentStageIndex].cols}, minmax(72px, 1fr))`
    : 'repeat(4, 1fr)';
```

### Memory-match Playground

File: `src/lib/exercises/memory-match/Playground.svelte`

Currently self-contained with inline DB writes and results display:

```svelte
<script lang="ts">
  import MemoryMatchGame, { type FullResult } from "./MemoryMatchGame.svelte";
  import ResultsChart from "./ResultsChart.svelte";
  import { toDbAttempts } from "./results-adapter";

  let running = true;
  let finalResult: FullResult | null = null;

  async function sendToDb(result: FullResult) {
    try {
      const attempts = toDbAttempts(result);
      await fetch("/tests/memoryMatch/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ results: attempts })
      });
    } catch (e) {
      console.error("[memory-match] DB write error:", e);
    }
  }

  function handleDone(e: CustomEvent<FullResult>) {
    finalResult = e.detail;
    running = false;
    sendToDb(finalResult);
  }
</script>

{#if running}
  <MemoryMatchGame on:done={handleDone} />
{:else if finalResult}
  <div class="head">
    <h1>Memory Match — результаты</h1>
    <button class="btn" on:click={restart}>Пройти заново</button>
  </div>
  <ResultsChart perStage={finalResult.perStage} />
{/if}
```

Problems:
1. Posts to `/tests/memoryMatch/playground` instead of the exercise route
2. Uses `on:done` / `createEventDispatcher` (Svelte 4)
3. Has inline results display instead of delegating to Result.svelte
4. Uses its own `toDbAttempts()` adapter that maps to the test DB schema

### Types

File: `src/lib/exercises/memory-match/types.ts`

Defines `FullResult` with nested `StageResult[]` including `PairMetric[]` arrays. Too complex for flat DB rows.

### Results adapter

File: `src/lib/exercises/memory-match/results-adapter.ts`

Already has `toDbAttempts()` that converts `FullResult` to the test's `memory_match_attempt` schema format. We'll need a similar function but for the exercise-specific summary type.

### Existing test DB table

File: `src/lib/server/db/models/tests.ts` (lines 169–185)

```ts
export const memoryMatchAttempt = sqliteTable('memory_match_attempt', {
    id: text('id').primaryKey().$defaultFn(generate),
    attempt: integer('attempt').notNull(), // 1..3
    time: integer('time').notNull(),
    stage: integer('stage').notNull(),
    cards: integer('cards').notNull(),
    flips: integer('flips').notNull(),
    mistakes: integer('mistakes').notNull(),
    efficiency: integer('efficiency').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(true),
    sessionId: text('session_id')
        .notNull()
        .references(() => session.id),
    createdAt: text('created_at')
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
});
```

We need a separate exercise table because sessions reference different session tables (test vs exercise). But we can mirror the column structure, adding only what's needed for the exercise context (e.g., totalDurationMs).

### Design decisions for DB persistence

**Approach A (exclude complex fields):** Store only summary metrics per stage as individual attempt rows. Each row = one stage of the three-stage game. Summary metrics: flipsCount, mistakes, durationMs, cardsCount, efficiency. This matches the existing test pattern exactly.

This is the right choice because:
- Drill-down into pair-level detail isn't needed for the MVP results page
- The existing `ResultsChart.svelte` only uses per-stage summaries (flipsCount/cardsCount → efficiency)
- Matches how other exercises exclude detailed logs (emoji excludes trialLog, numbers excludes reviews)

### Conventions

Follow established patterns from plans 001–007. Exemplar files:
- Numbers (simple): `src/lib/exercises/numbers/Playground.svelte`, `src/lib/exercises/numbers/Result.svelte`
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
- `src/lib/server/db/models/exercises.ts` — add `memoryMatchExerciseAttempt` table
- `src/lib/server/db/controllers/result.ts` — register new table
- `src/lib/exercises/types.ts` — add memory-match type entries
- `src/lib/exercises/memory-match/types.ts` — add DB-safe summary export type
- `src/lib/exercises/memory-match/MemoryMatchGame.svelte` — convert from `createEventDispatcher` to callback props
- `src/lib/exercises/memory-match/Playground.svelte` — rewrite to use `gameEnd`/`sendResults` props, remove inline results/DB logic
- `src/lib/exercises/memory-match/Result.svelte` — create new file
- `src/lib/exercises/index.ts` — add `result` loader
- `src/routes/(app)/exercises/[slug]/playground/+server.ts` — add slug mapping
- `src/routes/(app)/exercises/[slug]/results/+page.server.ts` — add slug→type mapping

**Out of scope**:
- `src/lib/server/db/models/tests.ts` — do NOT modify test tables or controller entries
- `src/lib/exercises/memory-match/results-adapter.ts` — leave as-is (still used by internal code); the new flow won't call it
- `src/lib/exercises/memory-match/ResultsChart.svelte` — reused inside new Result.svelte, not modified
- Any changes to other exercises or shared page shells

## Git workflow

- Branch: `advisor/011-memory-match-save-results`
- Commit per step; message style: conventional commits (e.g., `feat(memory-match): add exercise result persistence`)
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add DB-safe summary type

In `src/lib/exercises/memory-match/types.ts`, add at the bottom:

```ts
export type MemoryMatchSummaryRow = {
    stage: number;
    cardsCount: number;
    flipsCount: number;
    mistakes: number;
    durationMs: number;
    efficiency: number;
};
```

This is the flat per-stage summary that maps cleanly to SQLite columns. It intentionally excludes `pairMetrics[]` and other complex nested data.

**Verify**: File saves without errors.

### Step 2: Add memoryMatchExerciseAttempt table to DB models

Add after the last table definition in `src/lib/server/db/models/exercises.ts`:

```ts
export const memoryMatchExerciseAttempt = sqliteTable('memory_match_exercise_attempt', {
    id: text('id').primaryKey().$defaultFn(generate),
    attempt: integer('attempt').default(1).notNull(),
    stage: integer('stage').notNull(),
    cardsCount: integer('cards_count').notNull(),
    flipsCount: integer('flips_count').notNull(),
    mistakes: integer('mistakes').notNull(),
    durationMs: integer('duration_ms').notNull(),
    efficiency: integer('efficiency').notNull(),
    sessionId: text('session_id')
        .notNull()
        .references(() => session.id),
    createdAt: text('created_at')
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
});
```

Notes:
- Table name: `memory_match_exercise_attempt` (differentiated from test table)
- Each row represents one stage of the game (stage 1, 2, or 3)
- `attempt` defaults to 1; `stage` holds the actual stage number (matching the test convention where `attempt` and `stage` are both present)
- `efficiency` stored as integer — multiply float by 1000 for storage, divide by 1000 on read (see Step 9 Result.svelte)

**Verify**: File saves without errors.

### Step 3: Register in the result controller

In `src/lib/server/db/controllers/result.ts`:

1. Add import:
```ts
import { ..., memoryMatchExerciseAttempt } from '$lib/server/db/models/exercises';
```

2. Add to BOTH maps with key `'memoryMatchExercise'`:
```ts
const attemptTableMap = {
    // ...existing...
    memoryMatchExercise: memoryMatchExerciseAttempt
};

const queryTableMap = {
    // ...existing...
    memoryMatchExercise: db.query.memoryMatchExerciseAttempt
};
```

Note: Use `'memoryMatchExercise'` key, NOT `'memoryMatch'` (which is occupied by the test entry).

**Verify**: No TypeScript errors.

### Step 4: Extend TypeScript types

In `src/lib/exercises/types.ts`:

1. Import:
```ts
import type { MemoryMatchSummaryRow } from './memory-match/types';
```

2. Add to `ExerciseType` union:
```ts
| 'memoryMatchExercise'
```

3. Add to `ExerciseResultMap`:
```ts
memoryMatchExercise: MemoryMatchSummaryRow;
```

4. Add to `ExerciseResult` and `ExerciseResults` unions:
```ts
// In ExerciseResult:
| MemoryMatchSummaryRow

// In ExerciseResults:
| MemoryMatchSummaryRow[]
```

**Verify**: `npm run check` passes.

### Step 5: Convert MemoryMatchGame.svelte to use callback props

Update `src/lib/exercises/memory-match/MemoryMatchGame.svelte`.

Remove:
```ts
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher<{ done: FullResult }>();
```

Add props destructuring at top of script:
```ts
let {
    gameEnd,
    sendResults,
    stages = [
        { stage: 1, rows: 3, cols: 4 },
        { stage: 2, rows: 4, cols: 4 },
        { stage: 3, rows: 4, cols: 5 }
    ]
}: {
    gameEnd: () => void;
    sendResults: (results: MemoryMatchSummaryRow[]) => void;
    stages?: StageConfig[];
} = $props();
```

Import the summary type:
```ts
import type { MemoryMatchSummaryRow } from './types';
```

Replace the dispatch call in `nextStage()`:
```ts
// OLD:
dispatch('done', { perStage, totalDurationMs, totalFlips, totalMistakes, seed });

// NEW:
const summaryRows: MemoryMatchSummaryRow[] = perStage.map((s) => ({
    stage: s.stage,
    cardsCount: s.cardsCount,
    flipsCount: s.flipsCount,
    mistakes: s.mistakes,
    durationMs: s.durationMs,
    efficiency: Math.round((s.flipsCount / s.cardsCount) * 1000)
}));
sendResults(summaryRows);
gameEnd();
```

Also remove the inline `<button>` start game display at the beginning (the "Начать" button) if it would be redundant — the route page handles restart navigation. However, keep it since the current design has the user press "Начать" within the game component itself. Just ensure the game component doesn't try to render post-game content.

Convert the `$:` reactive declaration:
```ts
// OLD:
$: grid = stages[currentStageIndex]
    ? `repeat(${stages[currentStageIndex].cols}, minmax(72px, 1fr))`
    : 'repeat(4, 1fr)';

// NEW:
let grid = $derived(
    stages[currentStageIndex]
        ? `repeat(${stages[currentStageIndex].cols}, minmax(72px, 1fr))`
        : 'repeat(4, 1fr)'
);
```

Keep the rest of the template unchanged (the board rendering, card click logic, etc.). Remove any inline post-game results display — after calling `sendResults()` + `gameEnd()`, the route page redirects away.

**Verify**: `npm run check` passes.

### Step 6: Rewrite Playground.svelte as thin forwarding wrapper

Replace the entire content of `src/lib/exercises/memory-match/Playground.svelte` with:

```svelte
<script lang="ts">
	import MemoryMatchGame from './MemoryMatchGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<MemoryMatchGame {gameEnd} {sendResults} />
```

All the previous inline logic (`sendToDb`, `handleDone`, `restart`, `ResultsChart`) is removed — the route page now handles saving via `sendResults` prop, and results display lives in the dedicated `Result.svelte`.

**Verify**: File compiles without errors.

### Step 7: Create Result.svelte (Variant B — embedded chart)

Create new file `src/lib/exercises/memory-match/Result.svelte`:

```svelte
<script lang="ts">
	import type { MemoryMatchSummaryRow } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';
	import ResultsChart from './ResultsChart.svelte';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();

	const chartData = results.map((r_raw) => {
		const r = r_raw as MemoryMatchSummaryRow;
		return {
			stage: r.stage,
			durationMs: r.durationMs,
			cardsCount: r.cardsCount,
			flipsCount: r.flipsCount,
			mistakes: r.mistakes
		};
	});

	const totalDurationMs = results.reduce(
		(a: number, b_raw: any) => a + (b_raw as MemoryMatchSummaryRow).durationMs,
		0
	);
	const totalFlips = results.reduce(
		(a: number, b_raw: any) => a + (b_raw as MemoryMatchSummaryRow).flipsCount,
		0
	);
	const totalMistakes = results.reduce(
		(a: number, b_raw: any) => a + (b_raw as MemoryMatchSummaryRow).mistakes,
		0
	);
</script>

<ResultsChart perStage={chartData} />

<div class="grid grid-cols-3 gap-4 py-2">
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Время</span>
		<strong class="text-2xl">{(totalDurationMs / 1000).toFixed(1)} с</strong>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Открытия</span>
		<strong class="text-2xl">{totalFlips}</strong>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Ошибки</span>
		<strong class="text-2xl">{totalMistakes}</strong>
	</div>
</div>
```

This follows Variant B (embedded chart like raven-matrices/campimetry) plus standard stat cards below.

Note: The existing `ResultsChart.svelte` expects `{perStage}` prop with shape `{ stage, durationMs, cardsCount, flipsCount, mistakes }[]` using `export let` (Svelte 4 style). Since it still works at runtime, we feed it compatible data rather than rewriting it.

**Verify**: File exists and imports resolve.

### Step 8: Register the result loader

In `src/lib/exercises/index.ts`, update the memory-match entry in `exerciseLoaders`:

```ts
'memory-match': {
    about: () => import('./memory-match/About.svelte'),
    playground: () => import('./memory-match/Playground.svelte'),
    result: () => import('./memory-match/Result.svelte') // NEW
},
```

**Verify**: `npm run check` passes.

### Step 9: Update route handlers

**File**: `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Add slug mapping to `SLUG_TO_EXERCISE_TYPE`:
```ts
'memory-match': 'memoryMatchExercise',
```

No special POST handling needed — each stage becomes one attempt row, which is what `postResult()` does automatically.

**File**: `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Add mapping to `slugToExerciseType`:
```ts
'memory-match': 'memoryMatchExercise',
```

**Verify**: Both files save without errors.

### Step 10: Push schema changes and verify

```bash
npm run init-db-dev
```

Then verify the table exists:
```bash
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='memory_match_exercise_attempt';"
```

Run quality checks:
```bash
npm run check && npm run lint && npm run build
```

Manual E2E verification:
1. Navigate to `/exercises/memory-match/about`
2. Start a game, play through all three stages to completion
3. Verify: POST `/exercises/memory-match/playground` returns 201
4. Verify: page navigates to `/exercises/memory-match/results`
5. Verify: results page shows accordion entry with chart and stat cards
6. Play again → second accordion entry appears

## Test plan

No automated tests exist for this flow currently. Manual E2E verification above covers the critical path.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] Table `memory_match_exercise_attempt` exists in the dev database
- [ ] `grep -r "createEventDispatcher" src/lib/exercises/memory-match/MemoryMatchGame.svelte` returns NO matches
- [ ] `grep -r "sendToDb\|handleDone" src/lib/exercises/memory-match/Playground.svelte` returns NO matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- You discover that `memoryMatchExerciseAttempt` already exists in `models/exercises.ts`.
- You discover that `MemoryMatchGame.svelte` has been significantly restructured (more than just dispatcher replacement).

## Maintenance notes

- The `results-adapter.ts` file is left in place but is no longer called from the exercise flow. It can be removed once the old Playground code is confirmed unused. Do NOT delete it in this plan.
- The ExerciseType key `'memoryMatchExercise'` differs from URL slug `'memory-match'` — handled by slug-to-type mappings.
- The `efficiency` field is stored as an integer (×1000). If future components read it, divide by 1000 to get the actual ratio.
- The `ResultsChart.svelte` inside memory-match still uses Svelte 4 `export let` syntax. It works fine at runtime but should be migrated to runes when the component is next touched for other reasons. Not part of this plan.
