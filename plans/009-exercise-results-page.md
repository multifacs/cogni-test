# Plan 009: Generic Exercise Results Page for Future Exercises

**Status:** TODO
**Effort:** Medium
**Depends on:** Plans 001–007 (all DONE)

## Problem

Plans 001–007 each added result persistence and display for one exercise at a time. Each plan followed an identical pattern but had to repeat the same boilerplate: add a DB table, register it in controller maps, extend `ExerciseType` unions, create a per-exercise `Result.svelte`, and update route handler allow-lists. Adding results support for future exercises still requires touching 6+ files across DB, types, routes, and UI.

This spec describes how to implement a results page for **any new exercise** that will need result persistence in the future. It serves as both a reference guide and a checklist.

## Current Architecture Summary

### Data Flow (completed game → results page)

```
1. User completes exercise in Playground component
2. Game calls sendResults([result]) then gameEnd()
3. Playground forwards these calls up to the route page
4. Route page's onSendResults() POSTs {results} to /exercises/{slug}/playground
5. POST handler calls postResult(results, exerciseType, userId)
   → Creates a session row + inserts attempt row(s)
6. On gameEnd(), route page redirects to /exercises/{slug}/results
7. Results +page.server.ts calls getResults(exerciseType, userId)
   → Returns ResultInfo[] (sessions with nested attempts)
8. +page.svelte renders accordion by session, lazy-loads per-exercise Result component
9. Result component receives {results, exerciseType, meta} props, casts to specific type, renders metric cards
```

### Key Files & Their Roles

| File | Role | What you change when adding a new exercise |
|------|------|-------------------------------------------|
| `src/lib/server/db/models/exercises.ts` | Drizzle table definitions | Add `{exerciseName}Attempt` table |
| `src/lib/server/db/schema.ts` | Re-exports models | No change needed (`export * from './models/exercises'` already exists) |
| `src/lib/server/db/controllers/result.ts` | `postResult()` / `getResults()` | Add to `attemptTableMap` and `queryTableMap` |
| `src/lib/exercises/types.ts` | Type unions | Add to `ExerciseType`, `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`; import the result type |
| `src/lib/exercises/index.ts` | Exercise registry | Add `result: () => import(...)` loader entry |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | POST endpoint | Add slug to `EXERCISES_WITH_RESULTS` array |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | SSR data load | Add slug→type mapping to `slugToExerciseType` |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | GET API endpoint | Add slug to `EXERCISES_WITH_RESULTS` array |
| `src/lib/exercises/{name}/types.ts` | Exercise-specific types | Must export a flat summary type for DB persistence |
| `src/lib/exercises/{name}/{Game}.svelte` | Game component | Replace `createEventDispatcher` with `gameEnd`/`sendResults` props |
| `src/lib/exercises/{name}/Playground.svelte` | Playground wrapper | Forward `gameEnd`/`sendResults` props; remove inline results |
| `src/lib/exercises/{name}/Result.svelte` | Per-exercise results display | **New file** — receives `results`, renders metric cards |

### The Two Result Component Variants

All existing exercises follow one of two patterns for their `Result.svelte`:

#### Variant A — Stat Cards (simple, most exercises)

Used by: attention, emoji, flanker, letters, numbers, pictures

```svelte
<script lang="ts">
	import type { SomeResult } from './types';
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
	{@const attempt = attempt_raw as SomeResult}
	<div class="grid grid-cols-{2|3|4} gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Label</span>
			<strong class="text-2xl">{attempt.value}</strong>
		</div>
		<!-- more cards -->
	</div>
{/each}
```

Props contract:
- `results: ExerciseResults` — array of attempt objects (typed as union, cast inside)
- `exerciseType?: string` — optional, currently unused in simple variants
- `meta?: string[]` — optional, currently unused in simple variants

Card styling is consistent across all exercises: `bg-[#364b6c]`, `rounded-2xl`, `text-center`, `text-white`.

Grid columns depend on metric count:
- 2 metrics → `grid-cols-2` (numbers: Верно/Max span)
- 3 metrics → `grid-cols-3` (attention: Найдено/Время/Ошибки; emoji: Верно/Ошибки/Точность; letters: Max span/Раундов/Время; pictures: Правильных/Максимум/Точность)
- 4 metrics → `grid-cols-4` or `grid-cols-2` with 2 rows (flanker: Верно/Время/Ошибки/Flanker-эффект as 2×2 grid)

#### Variant B — Embedded Chart (complex)

Used by: raven-matrices only

Reuses existing `ResultsChart.svelte` inside the Result component. Reconstructs `RavenFullResult` from DB row data, passes to chart. Has its own deeply styled markup.

### Shared Accordion / Page Shell

The **results page itself** (`+page.svelte`) owns the accordion shell:
- Fetches `data.results` from server load
- Groups sessions into expandable rows (click date header → show/hide details)
- Lazy-loads the per-exercise `Comp` via `exercise.result()` import
- Passes `exerciseType`, `results={result.attempts}`, `meta` to the loaded component
- Renders bottom nav: "Назад" + "Пройти снова"

The `Result.svelte` components are rendered **inside** each expanded accordion section. They only handle the inner content (stat cards), not the accordion structure or navigation.

### Which Exercises Already Have Results vs Not

**With results (7):** attention, emoji, flanker, letters, numbers, pictures, raven-matrices

**Without results (6):**

| Exercise | Has Playground? | Has `types.ts`? | Notes |
|----------|----------------|-----------------|-------|
| word-morphing | Yes | No | Needs types defined first |
| campimetry | Yes | No | Has `campimetryAttempt` in test DB models already; used as test not exercise |
| memory-match | Yes | Yes (`FullResult`) | Types ready; has `memoryMatchAttempt` in test DB models |
| nback-stream | Yes | Yes (`FullResult`) | Types ready |
| road-trip | No | No | No playground yet |
| not-lost | No | No | No playground yet |

## Step-by-step Implementation Checklist

When adding results persistence for a new exercise, complete ALL of these steps in order:

### Step 1: Define the result type

**File:** `src/lib/exercises/{name}/types.ts`

Define a flat result type whose fields map cleanly to SQLite columns. Follow these rules:

1. Use primitive types (`number`, `boolean`, `string`) that map directly to SQLite column types
2. Exclude variable-length arrays and nested objects from the DB-persisted type (see "Handling Complex Data" below)
3. If the exercise already has a rich result type with nested data, create a separate DB-friendly summary type:

```ts
// If full result includes complex data:
export type MyFullResult = {
	score: number;
	maxScore: number;
	details: DetailRecord[]; // too complex for flat row
};

// Create a DB-safe summary:
export type MyDBResult = Omit<MyFullResult, 'details'>;
```

4. Do NOT include an `attempt` field — the DB table handles this with `.default(1).notNull()`

### Step 2: Add the attempt table to the DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the last existing table definition:

```ts
export const myExerciseAttempt = sqliteTable('my_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	// ...result fields as integer/text columns...
	// snake_case in first arg (SQLite), camelCase in key name (Drizzle/TS):
	someField: integer('some_field').notNull(),
	someBool: integer('some_bool', { mode: 'boolean' }).notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Conventions:
- Table name: `{snake_case_name}_attempt`
- Always include `id`, `attempt` (with `.default(1).notNull()`), `sessionId`, `createdAt`
- Import `generate` from `$lib/utils/db-utils.js` if not already imported
- Reference `session` from `'./tests'` (shared session table)
- Booleans use `integer('col', { mode: 'boolean' })`
- JSON data stored as `text('col')` — see "Handling Complex Data"
- Run schema push after adding: `npm run init-db-dev`

### Step 3: Register in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

Two changes:

1. Add to the import block at the top:
```ts
import { ..., myExerciseAttempt } from '$lib/server/db/models/exercises';
```

2. Add to BOTH lookup maps:

```ts
const attemptTableMap = {
	// ...existing entries...
	myExercise: myExerciseAttempt
};

const queryTableMap = {
	// ...existing entries...
	myExercise: db.query.myExerciseAttempt
};
```

The map key MUST match the `ExerciseType` string and the `session.testType` value stored in the DB.

### Step 4: Extend TypeScript types

**File:** `src/lib/exercises/types.ts`

Four additions:

1. Import the result type:
```ts
import type { MyResult } from '$lib/exercises/my-exercise/types';
```

2. Add to `ExerciseType` union:
```ts
export type ExerciseType =
	| 'attention'
	| 'emoji'
	// ...existing...
	| 'myExercise';
```

3. Add to `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
	attention: AttentionResult;
	// ...existing...
	myExercise: MyResult;
};
```

4. Add to `ExerciseResult` and `ExerciseResults` unions:
```ts
export type ExerciseResult =
	| AttentionResult
	// ...existing...
	| MyResult;

export type ExerciseResults =
	| AttentionResult[]
	// ...existing...
	| MyResult[];
```

Use the DB-safe summary type here (without nested arrays), NOT the full result type with answer logs etc.

### Step 5: Update the game component

**File:** `src/lib/exercises/{name}/{Game}.svelte`

Replace the Svelte 4 event pattern with callback props:

Remove:
```ts
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher<{ done: SomeResult }>();
// ...
dispatch('done', result);
```

Add:
```svelte
let {
	gameEnd,
	sendResults
}: {
	gameEnd: () => void;
	sendResults: (results: SomeResult[]) => void;
} = $props();
```

At every point where the game previously dispatched completion:
```ts
sendResults([result]);
gameEnd();
```

Also remove any inline post-finish display (stats cards, restart button) from the template — those belong on the results page now.

### Step 6: Update Playground wrapper

**File:** `src/lib/exercises/{name}/Playground.svelte`

Replace with thin forwarding wrapper (matches all existing exercises):

```svelte
<script lang="ts">
	import MyGame from './MyGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<MyGame {gameEnd} {sendResults} />
```

Remove any inline result display logic (stats cards, restart buttons, conditional rendering based on game state).

### Step 7: Register the result loader

**File:** `src/lib/exercises/index.ts`

Add `result` to the exercise's loader entry:

```ts
'my-exercise': {
	about: () => import('./my-exercise/About.svelte'),
	playground: () => import('./my-exercise/Playground.svelte'),
	result: () => import('./my-exercise/Result.svelte') // NEW
},
```

Adding `result` signals to the shared route infrastructure that this exercise supports persistence. Effects:
- Playground route page passes `sendResults` prop
- "Результаты" button appears after game end
- Results page lazy-loads the Result component

### Step 8: Update route handlers

Three files share the same pattern. Add the exercise slug to each:

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Add to `EXERCISES_WITH_RESULTS` array.

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

Add to `EXERCISES_WITH_RESULTS` array.

**File:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Add mapping to `slugToExerciseType` record:
```ts
const slugToExerciseType: Record<string, ExerciseType> = {
	attention: 'attention',
	// ...existing...
	'my-exercise': 'myExercise'
};
```

Note: Slug may differ from ExerciseType (e.g., URL uses `raven-matrices` but type is `ravenMatrices`). This mapping handles the translation.

### Step 9: Create the Result.svelte component

**New file:** `src/lib/exercises/{name}/Result.svelte`

Follow Variant A (stat cards) unless the exercise needs a custom chart. Minimal template:

```svelte
<script lang="ts">
	import type { MyResult } from './types';
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
	{@const attempt = attempt_raw as MyResult}
	<div class="grid grid-cols-{N} gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Metric Label</span>
			<strong class="text-2xl">{attempt.field}</strong>
		</div>
		<!-- One card per metric -->
	</div>
{/each}
```

Guidelines:
- Props signature must match exactly: `{ results: ExerciseResults; exerciseType?: string; meta?: string[] }`
- Cast each item from the generic union to your specific result type
- Use consistent card styling: `bg-[#364b6c] p-4 rounded-2xl text-center text-white`
- Label: `opacity-70`, Value: `text-2xl font-bold` (via `<strong>`)
- Grid: `grid-cols-2` for ≤2 metrics, `grid-cols-3` for 3, `grid-cols-2` with wrapping for 4+
- Keep it simple — no fetch logic, no loading states (the page shell handles that)
- For exercises with existing chart components (like raven-matrices' `ResultsChart.svelte`), use Variant B and embed the chart

### Step 10: Push schema changes and verify

```bash
npm run init-db-dev
```

Then verify the table exists:
```bash
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='my_exercise_attempt';"
```

Run quality checks:
```bash
npm run check && npm run lint && npm run build
```

Manual E2E verification:
1. Navigate to `/exercises/my-exercise/about`
2. Start a game, play through to completion
3. Verify: POST `/exercises/my-exercise/playground` returns 201
4. Verify: page navigates to `/exercises/my-exercise/results`
5. Verify: results page shows accordion entry with metric cards
6. Play again → second accordion entry appears

## Handling Complex Data

Some exercises produce results with nested/variable-length data that doesn't fit a flat DB row. Here's how prior plans handled this:

### Approach A: Exclude Complex Fields (most common)

Simply don't persist nested arrays/objects. Only store summary metrics.

Examples:
- **emoji**: `trialLog` excluded — only score/mistakes/totalAnswers/accuracy persisted
- **numbers**: `reviews[]` excluded — only correct/total/digitSpan persisted
- **letters**: `answerLog` excluded — only maxSpan/roundsCompleted/elapsed/timeoutTriggered persisted
- **pictures** (plan 007): `answers[]` excluded — only score/maxScore/normalizedScore persisted

Best for: Exercises where the summary tells the whole story and drill-down isn't needed.

### Approach B: JSON Text Column

Store the complex field as a `text` column containing serialized JSON.

Example from plan 005-pictures (early draft, not implemented):
```ts
answers: text('answers').notNull(), // JSON stringified AnswerRecord[]
```

In the game component, serialize before sending:
```ts
sendResults([{ ...result, answers: JSON.stringify(result.answers) }]);
```

In the Result component, deserialize when reading:
```ts
function parseAttempt(raw: any): PicturesResult {
	return { ...raw, answers: typeof raw.answers === 'string' ? JSON.parse(raw.answers) : raw.answers };
}
```

Trade-off: Simple schema but loses SQL-level queryability on individual items. Good for MVP.

Best for: Small-to-medium nested data that's always read/written as a batch.

### Approach C: Separate Detail Table (rare, high-value)

Create a companion detail table with foreign keys to the attempt row.

Example: **raven-matrices** (plan 006):
- `raven_attempt`: summary metrics (totalQuestions, correctCount, accuracy, durations)
- `raven_answer`: per-answer detail (taskId, taskClass, difficulty, selectedIndex, correctIndex, responseTimeMs, seed)

Requires custom POST handling in the route handler (two inserts in sequence). More complex but enables SQL queries on individual answers.

Best for: Rich diagnostic data where filtering/grouping by detail fields adds significant value.

### Decision Guide

Ask: "Will users ever want to filter/query/sort by individual items?"

- **No** → Use Approach A (exclude) or B (JSON)
- **Yes, rarely** → Use Approach B (JSON) for MVP, migrate to C later
- **Yes, frequently** → Use Approach C now

## Special Cases

### Multi-table Insert (raven-matrices pattern)

If using Approach C (separate detail table), the standard `postResult()` controller won't work because it only inserts flat attempt rows. Handle the POST in the route handler:

```ts
// In +server.ts POST handler:
if (slug === 'myComplexExercise') {
	const body = await request.json();
	const { summary, details } = body;

	// Insert summary via postResult (creates session + attempt)
	const sessionId = await postResult([summary], 'myComplexExercise', userId);

	// Look up the attempt ID we just created
	const attemptRow = await db.query.myExerciseAttempt.findFirst({
		where: (f, { eq }) => eq(f.sessionId, sessionId),
	});

	// Insert detail rows
	if (attemptRow && details.length > 0) {
		await db.insert(myDetailTable).values(
			details.map(d => ({ ...d, myExerciseAttemptId: attemptRow.id }))
		);
	}

	return json('success', { status: 201 });
}
```

The Playground may also need a custom `handleSendResults` function instead of blindly forwarding the route's `sendResults` prop, since the payload shape differs. See `raven-matrices/Playground.svelte` for reference.

### Non-standard Accuracy Values

If accuracy is stored as an integer percentage (0–100) in the DB but the in-memory type uses float (0–1), convert on insert and read:

Insert: `Math.round(accuracy * 100)`
Read: `accuracy / 100`

Currently only raven-matrices does this. New exercises should prefer storing as integer 0–100 directly.

### Slug vs. ExerciseType Naming Mismatches

URL slugs use kebab-case (`raven-matrices`, `memory-match`) while `ExerciseType` values use camelCase or single words (`ravenMatrices`, `memoryMatch`). The `slugToExerciseType` map in `+page.server.ts` handles this translation. When adding a new exercise, always check whether the slug matches the type string and add a mapping entry if they differ.

Current mismatches:
| URL Slug | ExerciseType |
|----------|-------------|
| `raven-matrices` | `ravenMatrices` |
| `memory-match` | `memoryMatch` |

Exercises without hyphens (attention, emoji, flanker, letters, numbers, pictures) match exactly.

## Maintenance Conventions

1. **`attempt=1` default** means each completed game is one row. Don't increment manually unless implementing multi-round sessions.
2. **`exercise?.result` is the feature flag** — the route page checks this to decide whether to pass `sendResults`, show the "Результаты" button, and redirect to results on game end. No separate boolean needed.
3. **Three-way sync required** when adding tables: DB model (`models/exercises.ts`), controller maps (`controllers/result.ts`), and type unions (`exercises/types.ts`). All three must list the same set of exercise types.
4. **Route handler allow-lists** (`EXERCISES_WITH_RESULTS`, `slugToExerciseType`) also need updating — that's four places total to keep in sync.
5. **Card styling convention** — always `bg-[#364b6c] p-4 rounded-2xl text-center text-white` with label `opacity-70` and value `text-2xl`.
6. **Svelte 5 runes only** — no `createEventDispatcher`, no `$:` reactive declarations, no `export let`. Use `$props()`, `$state`, `$derived`, `$effect`.
7. **Consider extracting `EXERCISES_WITH_RESULTS`** and `slugToExerciseType` to a shared module once the duplication becomes painful (currently 3 copies across route handlers).

## Future Improvements (Out of Scope)

- **Generic Result component** that reads a metric config from the registry instead of requiring per-exercise `Result.svelte` files
- **Trend charts** showing performance over time across sessions (Chart.js visualization like tests have)
- **Shared `EXERCISES_WITH_RESULTS` constant** deduped from the three route handler files
- **Auto-deriving allow-lists** from the registry (if `exercise.result` exists → include in POST/GET handlers automatically)
- **Per-trial detail loading** in results pages (lazy-load answers table within accordion entries)
