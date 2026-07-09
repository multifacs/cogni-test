# Plan 005: Save Numbers Exercise Results to DB + Add "Результаты" Button/Page

**Status:** DONE
**Effort:** Medium
**Depends on:** Plan 001 (done — provides exercise route infrastructure)

## Problem

The numbers exercise (`src/lib/exercises/numbers/`) collects `NumbersResult` data (`correct`, `total`, `digitSpan`, `reviews[]`) but:
1. Never persists results to the database
2. Uses deprecated `createEventDispatcher` instead of callback props
3. Shows inline result cards in Playground instead of navigating to a dedicated results page
4. Has no "Результаты" button after game completion

The attention exercise already implements this full flow and is the reference pattern.

## Current State

### Numbers exercise files
| File | Current behavior |
|------|-----------------|
| `types.ts` | Defines `LevelReview = { level, sequence, submitted, isCorrect, reactionTimeMs }` and `NumbersResult = { correct, total, digitSpan, reviews }` |
| `NumbersGame.svelte` | Uses deprecated `createEventDispatcher<{ done: NumbersResult }>()`; dispatches on final level completion; has internal finished-phase UI with per-level review and restart button |
| `Playground.svelte` | Listens to `done` event via `on:done` (Svelte 4 `on:` syntax), shows inline result cards (Верно / Max span) + "Пройти заново" reload button |
| `About.svelte` | Static description text |

### Already-done infrastructure from Plan 001
- The route page at `exercises/[slug]/playground/+page.svelte` already passes `gameEnd` / `sendResults` props and shows conditional "Результаты" button based on `exercise?.result`
- The POST handler at `exercises/[slug]/playground/+server.ts` exists but only allows `'attention'`
- The GET endpoint at `exercises/[slug]/results/+server.ts` exists but only serves `'attention'`
- The SSR loader at `exercises/[slug]/results/+page.server.ts` exists but only serves `'attention'`

## Design Decisions

1. **Follow the attention pattern exactly** — callback props on game component, thin forwarding wrapper in Playground, route page owns POST/navigation
2. **`reviews` array is not persisted to DB** — it contains variable-length arrays of objects with number arrays (`sequence[]`, `submitted[]`). This nested structure doesn't fit a flat attempt row. For MVP, store only the summary metrics (`correct`, `total`, `digitSpan`). If per-level detail is needed later, add a `numbers_level_review` table or JSON column.
3. **Add `'numbers'` as a valid `ExerciseType`** — just like `'attention'`
4. **Extend existing route server handlers** to accept `'numbers'` alongside `'attention'` — no new route files needed
5. **Result component shows 2 metric cards**: Верно (correct / total), Max span (digitSpan). Per-level breakdown can be added later if desired.
6. **Remove the internal finished-phase UI from NumbersGame.svelte** — the game should call `sendResults` + `gameEnd` and stop rendering its own result summary. The dedicated Result.svelte page handles display instead.

## Step-by-step Implementation

### Step 1: Add `numbersAttempt` table to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `attentionAttempt` definition:

```ts
export const numbersAttempt = sqliteTable('numbers_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	correct: integer('correct').notNull(),
	total: integer('total').notNull(),
	digitSpan: integer('digit_span').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- Column names use `snake_case` in SQLite (e.g., `digit_span`) while TypeScript uses `camelCase` (e.g., `digitSpan`). Drizzle maps these automatically via the first argument to `integer()`.
- `attempt` uses `.default(1).notNull()` — same pattern as `attentionAttempt`. Since `NumbersResult` doesn't include an `attempt` field, the default prevents NULL constraint violations when `postResult` spreads the result object.
- `reviews` is excluded (see Design Decision #2).

### Step 2: Register `numbersAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Add import:
```ts
import { attentionAttempt, numbersAttempt } from '$lib/server/db/models/exercises';
```

2. In `postResult()`, add `'numbers'` to the `insertAttempt` map:
```ts
const insertAttempt = {
    math: mathAttempt,
    stroop: stroopAttempt,
    // ...existing...
    attention: attentionAttempt,
    numbers: numbersAttempt
}[testType];
```

3. In `getResults()`, add `'numbers'` to the `attemptTable` map:
```ts
const attemptTable = {
    math: db.query.mathAttempt,
    // ...existing...
    attention: db.query.attentionAttempt,
    numbers: db.query.numbersAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

### Step 3: Add `'numbers'` as a valid `ExerciseType`

**File:** `src/lib/exercises/types.ts`

1. Import the type:
```ts
import type { NumbersResult } from '$lib/exercises/numbers/types';
```

2. Extend `ExerciseType`:
```ts
export type ExerciseType =
    | 'attention'
    | 'numbers';
```

3. Extend `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    numbers: NumbersResult;
};
```

4. Extend `ExerciseResult` and `ExerciseResults`:
```ts
export type ExerciseResult =
	| AttentionResult
	| NumbersResult;

export type ExerciseResults =
	| AttentionResult[]
	| NumbersResult[];
```

**Verification:** `npm run check` passes.

### Step 4: Update `NumbersGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/numbers/NumbersGame.svelte`

Replace:
```svelte
<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { NumbersResult, LevelReview } from './types';

	type Phase = 'intro' | 'memorize' | 'input' | 'review' | 'finished';

	const dispatch = createEventDispatcher<{ done: NumbersResult }>();
	// ...
	dispatch('done', { correct: correctLevels(), total: levelConfigs.length, digitSpan, reviews: acceptedReviews });
</script>
```

With:
```svelte
<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { NumbersResult, LevelReview } from './types';

	type Phase = 'intro' | 'memorize' | 'input' | 'review' | 'finished';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: NumbersResult[]) => void;
	} = $props();

	// ...existing state unchanged...
```

Then update the `continueAfterReview` function:

Replace the dispatch + phase='finished' block:
```ts
const continueAfterReview = () => {
	if (!currentReview) return;
	acceptedReviews = [...acceptedReviews, currentReview];
	if (isLastLevel()) {
		clearTimers();
		phase = 'finished';
		const digitSpan = acceptedReviews
			.filter((r) => r.isCorrect)
			.reduce((max, r) => Math.max(max, levelConfigs[r.level - 1].count), 0);
		dispatch('done', {
			correct: correctLevels(),
			total: levelConfigs.length,
			digitSpan,
			reviews: acceptedReviews
		});
		return;
	}
	startLevel(currentLevelIndex + 1);
};
```

With:
```ts
const continueAfterReview = () => {
	if (!currentReview) return;
	acceptedReviews = [...acceptedReviews, currentReview];
	if (isLastLevel()) {
		clearTimers();
		const digitSpan = acceptedReviews
			.filter((r) => r.isCorrect)
			.reduce((max, r) => Math.max(max, levelConfigs[r.level - 1].count), 0);
		const result: NumbersResult = {
			correct: correctLevels(),
			total: levelConfigs.length,
			digitSpan,
			reviews: acceptedReviews
		};
		sendResults([result]);
		gameEnd();
		return;
	}
	startLevel(currentLevelIndex + 1);
};
```

Key changes:
- Remove `createEventDispatcher` import entirely
- Add `gameEnd` and `sendResults` as `$props()`
- Call `sendResults([result])` then `gameEnd()` instead of dispatching
- Keep `onDestroy` for timer cleanup

Also remove the entire `{#if phase === 'finished'}` block (lines ~188–222) since the game no longer renders its own results summary. After calling `gameEnd()`, the parent takes over navigation. Remove `restartTest()` too — the "Пройти заново" button will be provided by the route page's bottom bar, not inside the game component.

The template becomes:
```svelte
{#if phase === 'intro'}
	<!-- existing intro markup -->
{:else if phase === 'memorize' || phase === 'input'}
	<!-- existing memorize/input markup -->
{/if}

{#if phase === 'review' && currentReview}
	<!-- existing review modal -->
{/if}
```

Remove all references to `phase === 'finished'` in the template.

### Step 5: Update `Playground.svelte` — forward callback props

**File:** `src/lib/exercises/numbers/Playground.svelte`

Replace the entire file with:

```svelte
<script lang="ts">
	import NumbersGame from './NumbersGame.svelte';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: any[]) => void;
	} = $props();
</script>

<NumbersGame {gameEnd} {sendResults} />
```

This matches the thin forwarding pattern used by the attention exercise's Playground.

### Step 6: Register `result` loader for numbers in the exercise registry

**File:** `src/lib/exercises/index.ts`

Update the `numbers` entry in `exerciseLoaders`:

```ts
numbers: {
	about: () => import('./numbers/About.svelte'),
	playground: () => import('./numbers/Playground.svelte'),
	result: () => import('./numbers/Result.svelte')
},
```

Adding `result` signals to the route page that this exercise supports DB persistence and should receive `sendResults` + show the "Результаты" button.

### Step 7: Extend existing route server handlers to accept `'numbers'`

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Change the slug check from:
```ts
if (slug !== 'attention') {
```
To:
```ts
if (!['attention', 'numbers'].includes(slug)) {
```

And change the `postResult` call from hardcoded `'attention'` to dynamic `testType`:
```ts
import type { AnySessionType } from '$lib/server/db/controllers/result.js';

const sessionTypes: Record<string, AnySessionType> = { attention: 'attention', numbers: 'numbers' };

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	const sessionType = sessionTypes[slug];
	if (!sessionType) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const { results }: { results: ExerciseResults | MetaResult } = await request.json();
	const userId = cookies.get('user_id') as string;

	await postResult(results, sessionType, userId);
	return json('success', { status: 201 });
};
```

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

Same pattern — replace `if (slug !== 'attention')` with a dynamic lookup:
```ts
const supportedSlugs = ['attention', 'numbers'];

export const GET: RequestHandler = async ({ params, cookies }) => {
	const slug = params.slug;
	if (!supportedSlugs.includes(slug)) {
		return json({ results: [] });
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(slug as AnySessionType, userId);
	return json({ results });
};
```

**File:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Same pattern:
```ts
const supportedSlugs = ['attention', 'numbers'];

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	if (!supportedSlugs.includes(slug)) {
		return { results: [] };
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(slug as AnySessionType, userId);
	return { results };
};
```

### Step 8: Create `Result.svelte` for numbers

**New file:** `src/lib/exercises/numbers/Result.svelte`

Self-contained result display component. Follows the same pattern as `src/lib/exercises/attention/Result.svelte` — accepts `{ slug }`, fetches own data, renders accordion with metric cards.

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { NumbersResult } from './types';
	import type { ResultInfo } from '$lib/exercises/types';

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

{#if loading}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner />
		<p>Загрузка результатов...</p>
	</main>
{:else if results.length > 0}
	<main class="main box-border">
		<div class="flex min-h-full flex-col justify-center gap-2">
			{#each results as result (result.sessionId)}
				<div class="w-full rounded-2xl bg-gray-600 shadow">
					<button
						class={`flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-4 py-3 transition-colors hover:bg-gray-400 ${openedSessionId !== result.sessionId ? 'hover:rounded-b-2xl' : ''}`}
						onclick={() => toggleSession(result.sessionId)}
					>
						<span class="font-medium text-gray-50">
							{openedSessionId === result.sessionId
								? 'Попытка от ' + formatUserLocalDate(result.createdAt)
								: formatUserLocalDate(result.createdAt)}
						</span>
						<svg
							class={`h-5 w-5 transform text-gray-500 transition-transform ${openedSessionId === result.sessionId ? 'rotate-180' : ''}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					{#if openedSessionId === result.sessionId}
						<div class="box-border flex flex-col items-center border-t p-2">
							{#each result.attempts as attempt_raw, i (i)}
								{@const attempt = attempt_raw as NumbersResult}
								<div class="grid grid-cols-2 gap-4 py-2">
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Верно</span>
										<strong class="text-2xl"
											>{attempt.correct} / {attempt.total}</strong
										>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Max span</span>
										<strong class="text-2xl">{attempt.digitSpan}</strong>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/numbers">Назад</Button>
		<Button color="blue" goto="/exercises/numbers/playground">Пройти снова</Button>
	</section>
{:else}
	<main class="main box-border">
		<h1>Попыток нет</h1>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/numbers">Назад</Button>
		<Button color="blue" goto="/exercises/numbers/playground">Пройти снова</Button>
	</section>
{/if}
```

Displays two cards per attempt row matching what the old inline Playground showed:
- **Верно** — `correct / total`
- **Max span** — `digitSpan`

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `numbersAttempt` table after `attentionAttempt` |
| `src/lib/server/db/controllers/result.ts` | Edit — import `numbersAttempt`, register in both lookup maps |
| `src/lib/exercises/types.ts` | Edit — add `'numbers'` to `ExerciseType`, `ExerciseResult`, `ExerciseResults`, `ExerciseResultMap` |
| `src/lib/exercises/numbers/NumbersGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props, remove finished-phase UI |
| `src/lib/exercises/numbers/Playground.svelte` | Edit — forward `gameEnd`/`sendResults` props, remove inline results display |
| `src/lib/exercises/numbers/Result.svelte` | **New** — self-contained result display (accordion + Верно/Max span cards) |
| `src/lib/exercises/index.ts` | Edit — add `result` loader for `numbers` entry |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | Edit — add `'numbers'` to supported slugs |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | Edit — add `'numbers'` to supported slugs |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | Edit — add `'numbers'` to supported slugs |

No new route files needed — the shared `[slug]` routes already exist from Plan 001.

## Files Explicitly Out of Scope

- Any other exercise besides numbers
- Persisting `reviews[]` (per-level detail) to DB — see Design Decision #2
- Chart.js visualization across sessions — card-based display is sufficient for MVP
- Svelte 5 migration of other exercises (besides NumbersGame's createEventDispatcher removal)
- Refactoring the three `+server.ts`/`+page.server.ts` slug checks into a shared utility

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. Schema push: `npx cross-env DATABASE_URL=file:sqlite.db npx drizzle-kit push --force` then verify:
   ```sql
   SELECT sql FROM sqlite_master WHERE name='numbers_attempt';
   ```
   Should return a CREATE TABLE statement with columns: `id, attempt, correct, total, digit_span, session_id, created_at`.
4. Manual E2E flow:
   - Navigate to `/exercises/numbers/about`
   - Start a game, complete all levels (or get some wrong)
   - Verify: page navigates to `/exercises/numbers/results`
   - Verify: browser DevTools shows POST `/exercises/numbers/playground` returns 201
   - Verify: results page shows accordion entry with date, expands to show Верно/Max span cards
   - Click "Назад", start another round, complete again
   - Go back to results → two accordion entries visible
5. Regression check for other exercises:
   - Open `/exercises/attention/playground`, confirm behavior unchanged
   - Bottom buttons show correct layout during play vs. after game end
