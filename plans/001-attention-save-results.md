# Plan 001: Save Attention Exercise Results to DB + Show Results

**Commit:** `699490d`
**Status:** DONE
**Effort:** Medium
**Depends on:** none

## Problem

The attention exercise (`src/lib/exercises/attention/`) collects results (`AttentionResult`) but never persists them to the database or shows historical results to the user. The test infrastructure (`src/lib/tests/` and `src/routes/(app)/tests/`) already implements full result persistence and display — this plan mirrors that pattern for the attention exercise.

## Current State

### Attention exercise (no DB saving)

- **Game component:** `src/lib/exercises/attention/AttentionGame.svelte`
  - Uses deprecated `createEventDispatcher<{ done: AttentionResult }>()` (see improvement plan 2.1)
  - Dispatches `{ n, m, errors, elapsed, found }` when all targets found
- **Playground wrapper:** `src/lib/exercises/attention/Playground.svelte`
  - Receives the `done` event, shows inline result cards (found/time/errors), offers "Пройти заново" button
  - No DB write, no navigation to results page
- **Type:** `src/lib/exercises/attention/types.ts` — `AttentionResult = { n, m, errors, elapsed, found }`

### How tests save results (the pattern to follow)

1. **Test Playground component** receives `gameEnd` and `sendResults` callback props from the route page (`src/routes/(app)/tests/[slug]/playground/+page.svelte:47`)
2. When game ends, Playground calls `sendResults(results)` which POSTs to `/tests/{slug}/playground` (`+server.ts:1-17`)
3. The server handler calls `postResult(results, slug, userid)` from `src/lib/server/db/controllers/result.ts`, which:
   - Creates a `session` row with the test type
   - Inserts attempt rows into the appropriate attempt table
4. Results page (`results/+page.server.ts`) calls `getResults(slug, userId)`, which joins sessions → attempts and returns them
5. The results page renders per-session accordions with test-specific `ResultsChart.svelte` components

### How memory-match exercise does it (another reference)

The memory-match exercise in `src/lib/exercises/memory-match/` saves directly from its Playground via `fetch("/tests/memoryMatch/playground", ...)` — it reuses the tests endpoint/server because its DB table (`memory_match_attempt`) is registered under `models/tests.ts`. This is simpler but tightly coupled to the tests routing namespace.

## Design Decision

Follow the **tests pattern** exactly: the route page (`exercises/[slug]/playground/+page.svelte`) provides `gameEnd` and `sendResults` callback props to the exercise Playground component, and handles bottom-button layout (2-col with "Результаты" after game end, 3-col during play). This avoids each Playground managing its own fetch logic — the route page owns POST/save, just like tests do.

Key differences from memory-match's approach (which does its own fetch inside Playground):
- Memory-match directly calls `fetch("/tests/memoryMatch/playground", ...)` from its Playground component — this tightly couples UI to routing.
- The tests pattern injects `sendResults` from the route page — cleaner separation of concerns, reusable by any exercise.

Additionally, use the existing `result` lazy loader on `ExerciseLoader` (instead of a separate `hasResults` flag on `TestData`) so the playground route page can conditionally show the "Результаты" button only for exercises that have DB persistence. Checking `exercise?.result` replaces the now-removed `hasResults` boolean — one fewer field to keep in sync.

For DB/controller plumbing, reuse the existing `postResult`/`getResults` functions — just register the new `attentionAttempt` table in their lookup maps. No new controllers needed.

## Step-by-step Implementation

### Step 1: Add `attentionAttempt` table to DB schema

**New file:** `src/lib/server/db/models/exercises.ts`

Create a separate model file for exercise-specific attempt tables (keeping `tests.ts` for test tables only):

```ts
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { generate } from '$lib/utils/db-utils.js';
import { session } from './tests';

export const attentionAttempt = sqliteTable('attention_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	n: integer('n').notNull(),
	m: integer('m').notNull(),
	errors: integer('errors').notNull(),
	elapsed: integer('elapsed').notNull(),
	found: integer('found').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

**Important:** The `attempt` column uses `.default(1).notNull()` instead of just `.notNull()`. The `AttentionResult` type (`{ n, m, errors, elapsed, found }`) has no `attempt` field. When `postResult` spreads result objects into the insert, `attempt` would be `undefined` → Drizzle sends `null` → violates the `NOT NULL` constraint. The `.default(1)` lets SQLite fill in the value automatically.

Also add the re-export to schema so drizzle-kit picks up the new model file:

**File:** `src/lib/server/db/schema.ts`

Add at bottom:
```ts
export * from './models/exercises';
```

### Step 2: Register `attentionAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Import `attentionAttempt` from the exercises model (not tests):
```ts
import { ..., attentionAttempt } from '$lib/server/db/models/exercises';
```

2. In `postResult()`, add `'attention'` to the `insertAttempt` map (after line 45):
```ts
const insertAttempt = {
    math: mathAttempt,
    stroop: stroopAttempt,
    // ...existing...
    attention: attentionAttempt
}[testType];
```

3. In `getResults()`, add `'attention'` to the `attemptTable` map (after line 78):
```ts
const attemptTable = {
    math: db.query.mathAttempt,
    // ...existing...
    attention: db.query.attentionAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

**Verification:** Open a REPL or temp script that imports `postResult` — no TS errors. Alternatively, run `npm run check`.

### Step 3: Add `attention` as a valid `TestType`

**File:** `src/lib/tests/types.ts`

This type is used by `controllers/result.ts` for `postResult(testType: TestType, ...)`. Currently:

```ts
export type TestType =
	| 'math'
	| 'stroop'
	| 'munsterberg'
	| 'memory'
	| 'swallow'
	| 'campimetry'
```

Add `'attention'`:

```ts
export type TestType =
	| 'math'
	| 'stroop'
	| 'munsterberg'
	| 'memory'
	| 'swallow'
	| 'campimetry'
	| 'attention'
```

Also add the `AttentionResult` import and extend `RegularResult`, `RegularResults`, and `TestResultMap`:

At top of file, add import:
```ts
import type { AttentionResult } from '$lib/exercises/attention/types';
```

Extend types:
```ts
export type TestResultMap = {
    // ...existing...
    attention: AttentionResult;
};

export type RegularResult =
    | StroopResult
    | MathResult
    | MunsterbergResult
    | MemoryResult
    | SwallowResult
    | CampimetryResult
    | AttentionResult;

export type RegularResults =
    | StroopResult[]
    | MathResult[]
    | MunsterbergResult[]
    | MemoryResult[]
    | SwallowResult[]
    | CampimetryResult[]
    | AttentionResult[];
```

**Verification:** `npm run check` passes.

### Step 4: Use `result` loader instead of `hasResults` flag

**File:** `src/lib/exercises/index.ts`

Instead of adding a `hasResults` boolean to `TestData` (which would be redundant with the existence of the `result` lazy loader on `ExerciseLoader`), use `exercise?.result` as the check. The `TestData` type stays as-is (no `hasResults` field). The `ExerciseLoader` type already has an optional `result?: () => Promise<any>` field.

The attention entry in `exerciseLoaders` already registers its result component:
```ts
attention: {
    about: () => import('./attention/About.svelte'),
    playground: () => import('./attention/Playground.svelte'),
    result: () => import('./attention/Result.svelte')
},
```

The route page checks `exercise?.result` where it previously would have checked `hasResults`:
- `if (exercise?.result)` → navigate to results page
- `sendResults={exercise?.result ? onSendResults : undefined}` → pass callback only when results exist
- `{#if isGameEnd && exercise?.result}` → show "Результаты" button

This means adding DB persistence for a future exercise only requires adding a `result` loader entry — no extra boolean flag needed.

### Step 5: Update `AttentionGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/attention/AttentionGame.svelte`

Follow the same pattern as test Playground components (e.g. `src/lib/tests/stroop/Playground.svelte`) which receive `gameEnd` and `sendResults` as props from the route page.

Replace:
```svelte
<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	// ...
	const dispatch = createEventDispatcher<{ done: AttentionResult }>();
	// ...
	dispatch('done', { n: targets.size, m: found.size, errors, elapsed, found: found.size });
</script>
```

With:
```svelte
<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { AttentionResult } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: AttentionResult[]) => void;
	} = $props();

	// ...existing state...

	function handleClick(num: number) {
		if (!started) return;
		if (targets.has(num)) {
			found = new Set([...found, num]);
			if (found.size === targets.size) {
				stopTimer();
				started = false;
				const result: AttentionResult = {
					n: targets.size,
					m: found.size,
					errors,
					elapsed,
					found: found.size
				};
				sendResults([result]);
				gameEnd();
			}
		} else {
			errors++;
		}
	}

	onDestroy(() => stopTimer());
</script>
```

Remove the unused `createEventDispatcher` import. Keep `onDestroy`. Remove the old dispatch call entirely — the component no longer decides what happens with the result, the parent does.

**Verification:** Game renders but cannot be completed yet until Playground is updated in next step.

### Step 6: Update `Playground.svelte` — forward props from route page

**File:** `src/lib/exercises/attention/Playground.svelte`

Instead of handling the game end itself, the Playground now just forwards `gameEnd` and `sendResults` down to the game component — exactly like test Playgrounds do. Remove all inline result display logic; the route page handles navigation after `gameEnd`.

```svelte
<script lang="ts">
	import AttentionGame from './AttentionGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } = $props();
</script>

<AttentionGame {gameEnd} {sendResults} />
```

This is the minimal change. The inline result cards that were previously shown here are no longer needed because the route page navigates to `/exercises/{slug}/results` on game end (Step 8).

**Verification:** Open `/exercises/attention/playground`, start a game, find all targets. On completion, the `sendResults` call will fail (no server endpoint yet), but `gameEnd()` should fire and navigate away.

### Step 7: Add POST handler at exercises playground route

**New file:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Modeled after `src/routes/(app)/tests/[slug]/playground/+server.ts`:

```ts
import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { RegularResults } from '$lib/tests/types.js';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	if (slug !== 'attention') {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const { results }: { results: RegularResults } = await request.json();
	const userId = cookies.get('user_id') as string;

	await postResult(results, 'attention', userId);
	return json('success', { status: 201 });
};
```

For now this only supports attention. Other exercises can be added by extending the slug check, similar to how the tests router handles any test type.

**Verification:** Restart dev server, play through a game, confirm POST returns 201. Check DB: `sqlite3 sqlite.db "SELECT * FROM attention_attempt;"` should show one row.

### Step 8: Update exercises playground route page — add `sendResults`, conditional "Результаты" button

**File:** `src/routes/(app)/exercises/[slug]/playground/+page.svelte`

This is the key change. The current exercises playground page (`+page.svelte`) does not pass `sendResults` or navigate to results. Mirror the tests playground page exactly:

Current code (lines 1–54):
```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { type SvelteComponent } from 'svelte';
	import { exerciseRegistry } from '$lib/exercises';

	const { data } = $props();
	const slug = data.slug;
	const exercise = $derived(exerciseRegistry[slug]);
	let Component: typeof SvelteComponent | null = $state(null);
	let isGameRunning = $state(true);
	let isGameEnd = $state(false);

	$effect(() => {
		Component = null;
		if (exercise?.playground) {
			exercise.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		goto(`/exercises/${slug}/about`);
	}
</script>

{#if Component}
	<main class="main flex flex-col items-center justify-evenly">
		<Component bind:this={childComponent} gameEnd={onGameEnd} {data}></Component>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
		<div></div>
	</section>
{:else}
	...
{/if}
```

Replace with (follows exact pattern of `tests/[slug]/playground/+page.svelte`):

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, RegularResults } from '$lib/tests/types.js';
	import { type SvelteComponent } from 'svelte';
	import { exerciseRegistry } from '$lib/exercises';

	const { data } = $props();
	const slug = data.slug;
	const exercise = $derived(exerciseRegistry[slug]);
	let Component: typeof SvelteComponent | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	$effect(() => {
		Component = null;
		if (exercise?.playground) {
			exercise.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		if (exercise?.result) {
			goto(`/exercises/${slug}/results`);
		}
	}

	async function onSendResults(results: RegularResults | MetaResult) {
		await fetch(`/exercises/${slug}/playground`, {
			method: 'POST',
			body: JSON.stringify({ results }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

{#if Component}
	<main class="main flex flex-col items-center justify-evenly">
		<Component
			bind:this={childComponent}
			gameEnd={onGameEnd}
			sendResults={exercise?.result ? onSendResults : undefined}
			{data}
		></Component>
	</main>

	{#if isGameEnd && exercise?.result}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
			<Button color="blue" goto={`/exercises/${slug}/results`}>Результаты</Button>
		</section>
	{:else if isGameEnd}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
			<div></div>
		</section>
	{:else}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
			<div></div>
		</section>
	{/if}
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка упражнения {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
		<div></div>
	</section>
{/if}
```

Key differences from current code:

| Behavior | Before | After |
|----------|--------|-------|
| On game end | Navigates to `/exercises/{slug}/about` | If `exercise?.result`: navigates to `/exercises/{slug}/results`; otherwise goes to about |
| `sendResults` prop | Not passed | Passed when `exercise?.result` is truthy; `undefined` otherwise |
| Bottom buttons after game end | Always 3-col (spacer + Назад + spacer) | If `exercise?.result`: 2-col (Назад + Результаты); otherwise 3-col |

Exercises without a `result` loader will not receive `sendResults`, so their Playground components simply won't call it — no changes needed for existing exercise Playground components.

**Verification:** Open `/exercises/attention/playground`. Complete a game. Confirm:
- Network tab shows POST `/exercises/attention/playground` returns 201
- Page navigates to `/exercises/attention/results`
- "Результаты" button appears after game end
- For other exercises (e.g. word-morphing), behavior is unchanged (no sendResults, navigates to /about)

### Step 9: Add results route — server-side load + GET API endpoint

**New file:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Modeled after `src/routes/(app)/tests/[slug]/results/+page.server.ts`:

```ts
import { getResults } from '$lib/server/db/controllers/result.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	if (slug !== 'attention') {
		return { results: [] };
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults('attention', userId);
	return { results };
};
```

**New file:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

GET endpoint so the self-contained `Result.svelte` component can fetch its own data:

```ts
import { getResults } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const slug = params.slug;
	if (slug !== 'attention') {
		return json({ results: [] });
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults('attention', userId);
	return json({ results });
};
```

**Verification:** Navigate to `/exercises/attention/results` after completing a game — page loads without error and data is available both through SSR (`data.results`) and via `fetch('/exercises/attention/results')`.

### Step 10: Create the Result component + update results page

**New file:** `src/lib/exercises/attention/Result.svelte`

Self-contained result display component. Accepts `{ slug }` as a prop, fetches its own data via the GET endpoint, and renders the accordion UI with found/time/errors cards plus navigation buttons:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { AttentionResult } from './types';
	import type { ResultInfo } from '$lib/tests/types';

	let { slug }: { slug: string } = $props();

	let results = $state<ResultInfo[]>([]);
	let loading = $state(true);
	let openedSessionId: string | null = $state(null);

	async function loadResults() {
		loading = true;
		try {
			const res = await fetch(`/exercises/${slug}/results`);
			if (res.ok) {
				const data = await res.json();
				results = data.results ?? [];
				openedSessionId = results[0]?.sessionId ?? null;
			}
		} finally {
			loading = false;
		}
	}

	loadResults();

	function toggleSession(sessionId: string) {
		openedSessionId = openedSessionId === sessionId ? null : sessionId;
	}
</script>

<!-- loading / results / empty states with accordion UI -->
```

**File:** `src/routes/(app)/exercises/[slug]/results/+page.svelte`

Updated to dynamically load the `result` component from the exercise registry and render it with `{ slug }`:

```svelte
<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { exerciseRegistry } from '$lib/exercises';
	import type { SvelteComponent } from 'svelte';

	const { data } = $props();
	const slug = data.slug;
	const exercise = $derived(exerciseRegistry[slug]);

	let Component: typeof SvelteComponent | null = $state(null);

	$effect(() => {
		Component = null;
		if (exercise?.result) {
			exercise.result().then((mod) => {
				Component = mod.default;
			});
		}
	});
</script>

{#if Component}
	<Component {slug} />
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner />
		<p>Загрузка результатов {slug}...</p>
	</main>
{/if}
```

**Verification:** Complete a game, navigate to `/exercises/attention/results`. Should show an accordion entry with date. Expand to see found/time/errors cards.

### Step 11 (Optional): Register `resultsChart` in the exercise loader

If you want a Chart.js visualization like other tests (showing performance over time), you can add a `ResultsChart.svelte` inside `src/lib/exercises/attention/` and register it. However, since attention has a simple summary (not time-series per-attempt), the card-based display in Step 10 is sufficient for MVP. Skip this step unless you want trend charts across sessions.

Note: The `result` lazy loader is already registered on the attention entry in `exerciseLoaders`. If adding a `ResultsChart`, you'd need to either:
1. Add a separate `resultsChart?: () => Promise<any>` field to `ExerciseLoader` and load it separately, or
2. Embed chart rendering inside `Result.svelte` itself

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | **New** — `attentionAttempt` table with `attempt: integer('attempt').default(1).notNull()` |
| `src/lib/server/db/schema.ts` | Edit — add `export * from './models/exercises'` |
| `src/lib/server/db/controllers/result.ts` | Edit — import `attentionAttempt` from `$lib/server/db/models/exercises`, register in both maps |
| `src/lib/tests/types.ts` | Edit — add `'attention'` to `TestType`, `RegularResult`, `RegularResults`, `TestResultMap` |
| `src/lib/exercises/index.ts` | Edit — remove `hasResults` from `TestData` type and all entries; `result` loader already registered on attention |
| `src/lib/exercises/attention/AttentionGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props |
| `src/lib/exercises/attention/Playground.svelte` | Edit — forward `gameEnd`/`sendResults` props, remove inline results display |
| `src/lib/exercises/attention/Result.svelte` | **New** — self-contained result display component (fetches own data, renders accordion + buttons) |
| `src/routes/(app)/exercises/[slug]/playground/+page.svelte` | Edit — add `onSendResults`, use `exercise?.result` instead of `hasResults` for conditional "Результаты" button |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | **New** — POST handler |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | **New** — load results from DB (SSR) |
| `src/routes/(app)/exercises/[slug]/results/+page.svelte` | Edit — dynamically load `Result` component from registry via `exercise.result()` |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | **New** — GET endpoint for self-contained Result component |

## Files Explicitly Out of Scope

- Any other exercise besides attention
- `src/lib/components/charts/ResultsChart.svelte` (generic chart) — not needed for MVP
- The test routes under `src/routes/(app)/tests/`
- The N+1 fix in `getResults()` (separate concern)
- Svelte 5 migration of other exercises (besides AttentionGame's createEventDispatcher removal)

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues  
3. `npm run build` — succeeds
4. Schema push: `npm run init-db-dev` then verify table exists:
   ```
   npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='attention_attempt';" 
   ```
   Should return the CREATE TABLE statement.
5. Manual E2E flow:
   - Navigate to `/exercises/attention/about`
   - Start a game, find all targets
   - Verify: page navigates to `/exercises/attention/results`
   - Verify: browser DevTools shows POST `/exercises/attention/playground` returns 201
   - Verify: results page shows accordion entry with date, expands to show found/time/errors cards
   - Click "Назад", then start another round, find all targets again
   - Go back to results → two accordion entries visible
6. Regression check for other exercises:
   - Open `/exercises/word-morphing/playground`, confirm it loads without error (no sendResults prop passed since hasResults=false)
   - Bottom buttons still show 3-col layout during play and after game end

## Maintenance Notes

- Adding DB persistence for another exercise follows the exact same pattern: add table to `models/exercises.ts` → register in controller maps → add `result` loader to `exerciseLoaders` → create self-contained `Result.svelte` → update Playground to accept `gameEnd`/`sendResults` props.
- The `TestType` union and `postResult`/`getResults` lookup maps must stay in sync with DB tables — if you add an exercise table, update all three places.
- The `attempt=1` default convention means each completed game is one row. If multi-round sessions are added later, increment `attempt` per round and group by `sessionId`.
- The `exercise?.result` check replaces the removed `hasResults` flag — exercises without a `result` loader still work exactly as before (no sendResults prop, navigate to /about, 3-col bottom buttons).
- This plan addresses the `createEventDispatcher` deprecation only for `AttentionGame.svelte`. The remaining exercises still use it (see improvement plan item 2.1).

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead (it uses cross-env to set DATABASE_URL).
- If the user doesn't have a `user_id` cookie (not logged in), `postResult` will receive `undefined` as `userId` which violates the NOT NULL constraint on `session.userId`. The existing tests routes have the same behavior — this is a pre-existing issue, not introduced by this plan. If blocking, add a guard: `if (!userId) return json({ error: 'unauthorized' }, { status: 401 });` in the POST handler.
- If an exercise Playground component doesn't accept `sendResults`/`gameEnd` props yet, it simply won't receive them — TypeScript won't error because Svelte passes extra props silently. The component must be updated to use them when adding DB support for that exercise.

## Bug Fix: `attempt` Column NULL Constraint Violation

**Root cause:** `AttentionResult` type is `{ n, m, errors, elapsed, found }` — no `attempt` field. The `postResult` controller spreads result objects into the Drizzle insert via `.values(attempts.map(attempt => ({ ...attempt, sessionId })))`. Since `attempt` was `.notNull()` without a default, Drizzle sent `null` for the missing field → SQLite rejected it with a NOT NULL constraint violation.

**Fix applied:** Moved `attentionAttempt` table definition to a new `src/lib/server/db/models/exercises.ts` file (separate from `tests.ts`) with `attempt: integer('attempt').default(1).notNull()`. This lets SQLite auto-fill `1` when the field isn't provided in the insert payload.

Also ran `drizzle-kit push --force` to apply the `DEFAULT 1` on the existing `attention_attempt` table in SQLite.
