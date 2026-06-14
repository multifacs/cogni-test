# Plan 004: Save Letters Exercise Results to DB + Add "Результаты" Button/Page

**Status:** TODO
**Effort:** Medium
**Depends on:** Plan 001 (done — provides exercise route infrastructure)

## Problem

The letters exercise (`src/lib/exercises/letters/`) collects `LettersResult` data (`maxSpan`, `roundsCompleted`, `elapsed`, `timeoutTriggered`) but:
1. Never persists results to the database
2. Uses deprecated `createEventDispatcher` instead of callback props
3. Shows inline result cards in Playground instead of navigating to a dedicated results page
4. Has no "Результаты" button after game completion

The attention exercise already implements this full flow and is the reference pattern.

## Current State

### Letters exercise files
| File | Current behavior |
|------|-----------------|
| `types.ts` | Defines `RoundEntry = { target, submitted, isCorrect, reactionTimeMs, letterCount }` and `LettersResult = { maxSpan, roundsCompleted, elapsed, timeoutTriggered }` |
| `LettersGame.svelte` | Uses deprecated `createEventDispatcher<{ done: LettersResult }>()`; dispatches on wrong answer or 60s timeout; has internal `restart()` and post-finish result display |
| `Playground.svelte` | Listens to `done` event via `on:done`, shows inline result cards (Max span / Раундов / Время) + "Пройти заново" button |
| `About.svelte` | Static description text |

### Already-done infrastructure from Plan 001
- The route page at `exercises/[slug]/playground/+page.svelte` already passes `gameEnd` / `sendResults` props and shows conditional "Результаты" button based on `exercise?.result`
- The POST handler at `exercises/[slug]/playground/+server.ts` exists (currently only allows `'attention'`)
- The GET endpoint at `exercises/[slug]/results/+server.ts` exists (currently only serves `'attention'`)
- The SSR loader at `exercises/[slug]/results/+page.server.ts` exists (currently only serves `'attention'`)
- The results page at `exercises/[slug]/results/+page.svelte` dynamically loads the Result component from `exercise.result()`

## Design Decisions

1. **Follow the attention pattern exactly** — callback props on game component, thin forwarding wrapper in Playground, route page owns POST/navigation
2. **Persist all summary metrics to DB** — `maxSpan`, `roundsCompleted`, `elapsed`, `timeoutTriggered` all map cleanly to flat columns. `RoundEntry[]` detail is not persisted (variable-length array; can be added later with a separate table or JSON column if needed).
3. **`timeoutTriggered` stored as boolean integer** — SQLite has no native boolean; store as `integer` with mode `'boolean'` (Drizzle convention used elsewhere in this schema).
4. **Add `'letters'` as a valid `ExerciseType`** — just like `'attention'`
5. **Extend existing route server handlers** to accept `'letters'` alongside whatever exercises are currently allowed — no new route files needed
6. **Result component shows 3 metric cards**: Max span (maxSpan), Раундов (roundsCompleted), Время (elapsed сек). Timeout indicator shown conditionally.
7. **Remove post-finish inline display from `LettersGame.svelte`** — the finished state markup (Max span / Время / "Пройти заново" button) should be simplified since results are shown on the dedicated results page.

## Step-by-step Implementation

### Step 1: Add `lettersAttempt` table to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `attentionAttempt` definition:

```ts
export const lettersAttempt = sqliteTable('letters_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	maxSpan: integer('max_span').notNull(),
	roundsCompleted: integer('rounds_completed').notNull(),
	elapsed: integer('elapsed').notNull(),
	timeoutTriggered: integer('time_limit', { mode: 'boolean' }).notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- `attempt` uses `.default(1).notNull()` (same pattern as `attentionAttempt`) because `LettersResult` has no `attempt` field — Drizzle would send `null` otherwise → NOT NULL violation.
- `timeoutTriggered` uses `{ mode: 'boolean' }` so Drizzle handles the JS `true/false` ↔ SQLite `1/0` mapping.
- No `answerLog` / `RoundEntry` persistence (variable-length array of complex objects; see design decision #2).
- Re-exported automatically via existing `export * from './models/exercises'` in `schema.ts`.

### Step 2: Register `lettersAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Update import (add `lettersAttempt`):
```ts
import { attentionAttempt, lettersAttempt } from '$lib/server/db/models/exercises';
```

(Adjust based on whichever imports exist from that module when this plan is applied — just add `lettersAttempt`.)

2. In `postResult()`, add `'letters'` to `insertAttempt` map:
```ts
const insertAttempt = {
    // ...existing...
    attention: attentionAttempt,
    letters: lettersAttempt
}[testType];
```

3. In `getResults()`, add `'letters'` to `attemptTable` map:
```ts
const attemptTable = {
    // ...existing...
    attention: db.query.attentionAttempt,
    letters: db.query.lettersAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

### Step 3: Add `'letters'` as a valid `ExerciseType`

**File:** `src/lib/exercises/types.ts`

1. Import `LettersResult`:
```ts
import type { LettersResult } from '$lib/exercises/letters/types';
```

2. Extend `ExerciseType`:
```ts
export type ExerciseType =
    | 'attention'
    | 'letters';
```

(Note: Include `'emoji'` and/or `'flanker'` if plans 002/003 have been applied before this one.)

3. Extend `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    letters: LettersResult;
};
```

4. Extend `ExerciseResult` and `ExerciseResults` unions:
```ts
export type ExerciseResult =
    | AttentionResult
    | LettersResult;

export type ExerciseResults =
    | AttentionResult[]
    | LettersResult[];
```

Note: If plans 002/003 have been applied, include `EmojiResult` and/or `FlankerResult` in both unions as well.

### Step 4: Update `LettersGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/letters/LettersGame.svelte`

Replace the dispatcher pattern with props:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { LettersResult } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: LettersResult[]) => void;
	} = $props();

	// ...all existing constants and state stay the same...

	function endGame() {
		stopTimers();
		started = false;
		finished = true;
		numLetters = START_LENGTH;
		const result: LettersResult = {
			maxSpan,
			roundsCompleted: answerLog.filter((r) => r.isCorrect).length,
			elapsed,
			timeoutTriggered
		};
		sendResults([result]);
		gameEnd();
	}

	// Remove restart() function — navigation is handled by the route page now.
</script>
```

Key changes:
- Remove `createEventDispatcher` import and usage
- Add `gameEnd` and `sendResults` as `$props()`
- Call `sendResults([result])` then `gameEnd()` instead of `dispatch('done', ...)`
- Remove `restart()` function (the route page's "Результаты"/"Назад" buttons handle navigation)
- Keep all other logic identical (letter generation, answer checking, timer)

The markup for the `{:else if finished}` block should be simplified to remove the post-finish display (stats cards + "Пройти заново") since those are shown on the dedicated results page:

Replace lines 206–224 (`{:else if finished}` block) with:
```svelte
{:else if finished}
	<div class="flex flex-col items-center justify-center gap-3">
		<p class="text-lg font-semibold text-white">
			{timeoutTriggered ? 'Время вышло' : 'Тест завершён'}
		</p>
	</div>
```

The full results are shown on `/exercises/letters/results`. This removes the duplicated inline Max span / Время cards and "Пройти заново" button.

### Step 5: Update `Playground.svelte` — forward props, remove inline results

**File:** `src/lib/exercises/letters/Playground.svelte`

Replace entire file:

```svelte
<script lang="ts">
	import LettersGame from './LettersGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<LettersGame {gameEnd} {sendResults} />
```

This mirrors `attention/Playground.svelte` exactly. All inline result display ("Пройти заново", Max span / Раундов / Время cards) is removed — the route page handles post-game navigation now.

### Step 6: Add `result` loader to letters entry in exercise registry

**File:** `src/lib/exercises/index.ts`

Update the letters loader entry:

```ts
letters: {
    about: () => import('./letters/About.svelte'),
    playground: () => import('./letters/Playground.svelte'),
    result: () => import('./letters/Result.svelte')
},
```

Adding the `result` lazy loader makes `exercise?.result` truthy for letters, which means:
- The playground route page will pass `sendResults` prop
- The "Результаты" button will appear after game end
- On game end, page navigates to `/exercises/letters/results`
- The about page shows a 3-col layout with Назад / Начать / История buttons

### Step 7: Update route server handlers to support `'letters'`

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Add `'letters'` to the allow-list. Replace the current slug check with:

```ts
const EXERCISES_WITH_RESULTS = ['attention', 'letters'];

if (!EXERCISES_WITH_RESULTS.includes(slug)) {
    return json({ error: 'unknown exercise' }, { status: 400 });
}
const { results }: { results: ExerciseResults | MetaResult } = await request.json();
const userId = cookies.get('user_id') as string;

await postResult(results, slug as AnySessionType, userId);
return json('success', { status: 201 });
```

Note: Using `slug as AnySessionType` (where `AnySessionType = TestType | ExerciseType`) avoids hard-coding per-exercise calls. Extracting to a constant array makes it easy to add future exercises. If plans 002/003 have been applied, include `'emoji'` and/or `'flanker'` in the array.

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

Same pattern:

```ts
const EXERCISES_WITH_RESULTS = ['attention', 'letters'];

if (!EXERCISES_WITH_RESULTS.includes(slug)) {
    return json({ results: [] });
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return json({ results });
```

**File:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Same pattern:

```ts
const EXERCISES_WITH_RESULTS = ['attention', 'letters'];

if (!EXERCISES_WITH_RESULTS.includes(slug)) {
    return { results: [] };
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return { results };
```

Consider extracting the `EXERCISES_WITH_RESULTS` constant to a shared location (e.g., `$lib/exercises/constants.ts`) if duplication becomes burdensome. For now, three copies are manageable.

### Step 8: Create `Result.svelte` for the letters exercise

**New file:** `src/lib/exercises/letters/Result.svelte`

Self-contained result display component, modeled after `attention/Result.svelte`. Fetches its own data via the GET endpoint, renders accordion UI with metric cards plus navigation buttons:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { LettersResult } from './types';
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
								{@const attempt = attempt_raw as LettersResult}
								<div class="grid grid-cols-3 gap-4 py-2">
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Max span</span>
										<strong class="text-2xl">{attempt.maxSpan}</strong>
									</div>
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Раундов</span>
										<strong class="text-2xl">{attempt.roundsCompleted}</strong>
									</div>
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Время</span>
										<strong class="text-2xl">{attempt.elapsed} сек</strong>
									</div>
								</div>
								{#if attempt.timeoutTriggered}
									<p class="text-center text-sm font-semibold text-red-400">Время вышло</p>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/letters">Назад</Button>
		<Button color="blue" goto="/exercises/letters/playground">Пройти снова</Button>
	</section>
{:else}
	<main class="main box-border">
		<h1>Попыток нет</h1>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/letters">Назад</Button>
		<Button color="blue" goto="/exercises/letters/playground">Пройти снова</Button>
	</section>
{/if}
```

Uses a 3-card layout per attempt: Max span, Раундов, Время. Shows a conditional "Время вышло" indicator below the cards when `timeoutTriggered` is true. Same accordion pattern as attention Result.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `lettersAttempt` table |
| `src/lib/server/db/controllers/result.ts` | Edit — import `lettersAttempt`, register in both maps |
| `src/lib/exercises/types.ts` | Edit — add `'letters'` to `ExerciseType`, `ExerciseResult`, `ExerciseResults`, `ExerciseResultMap`; import `LettersResult` |
| `src/lib/exercises/index.ts` | Edit — add `result` loader to letters entry |
| `src/lib/exercises/letters/LettersGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props; remove `restart()` and post-finish inline display |
| `src/lib/exercises/letters/Playground.svelte` | Edit — forward props, remove inline result display |
| `src/lib/exercises/letters/Result.svelte` | **New** — self-contained result display component |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | Edit — add `'letters'` to slug allow-list |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | Edit — add `'letters'` to slug allow-list |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | Edit — add `'letters'` to slug allow-list |

No new route files needed — the existing route infrastructure from Plan 001 handles everything.

## Files Explicitly Out of Scope

- Persisting `RoundEntry[]` answer log to DB (complex nested data; can be added later with a separate `letters_round_entry` table or JSON column)
- Any other exercise besides letters
- The test routes under `src/routes/(app)/tests/`
- Svelte 5 migration of other exercises (besides LettersGame's `createEventDispatcher` removal)
- Chart.js visualizations (card-based display is sufficient for MVP)
- Per-round reaction time breakdown in the Result component (can be added later)

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. `npm run build` — succeeds
4. Schema push: `npm run init-db-dev`, then verify table exists:
   ```
   npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='letters_attempt';"
   ```
5. Manual E2E flow:
   - Navigate to `/exercises/letters/about`
   - Verify: about page shows 3-col bottom buttons (Назад / Начать / История)
   - Start a game, play through until a wrong answer ends it (or let 60s expire)
   - Verify: browser DevTools shows POST `/exercises/letters/playground` returns 201
   - Verify: page navigates to `/exercises/letters/results`
   - Verify: results page shows accordion entry with date, expands to show Max span / Раундов / Время cards
   - Verify: if game ended by timeout, "Время вышло" indicator appears below the cards
   - Click "Пройти снова", complete another round
   - Go back to results → two accordion entries visible
6. Regression check for other exercises:
   - Open `/exercises/word-morphing/playground`, confirm it loads without error
   - Bottom buttons still show 3-col layout during play and after game end (no `result` loader → no `sendResults`)
7. Regression check for attention exercise:
   - Open `/exercises/attention/playground`, complete a game
   - Verify results still save and show correctly

## Maintenance Notes

- Adding DB persistence for another exercise follows the exact same pattern: add table to `models/exercises.ts` → register in controller maps → add to `ExerciseType` union → add `result` loader to `exerciseLoaders` → create self-contained `Result.svelte` → update Playground to accept `gameEnd`/`sendResults` props → extend the slug allow-list in route handlers.
- The `ExerciseType` union and result controller lookup maps must stay in sync with DB tables — if you add an exercise table, update all three places. The controller uses `AnySessionType = TestType | ExerciseType`.
- The `attempt=1` default convention means each completed game is one row. If multi-round sessions are added later, increment `attempt` per round and group by `sessionId`.
- The `exercise?.result` check drives the "Результаты"/"История" button visibility — exercises without a `result` loader still work exactly as before.
- Consider extracting `EXERCISES_WITH_RESULTS` to a shared constant if more exercises are added.
- This plan addresses the `createEventDispatcher` deprecation only for `LettersGame.svelte`. Other exercises still use it.

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead.
- If the user doesn't have a `user_id` cookie (not logged in), `postResult` will receive `undefined` as `userId` which violates the NOT NULL constraint on `session.userId`. Same pre-existing issue as all tests/exercises routes.
- If an exercise Playground component doesn't accept `sendResults`/`gameEnd` props yet, Svelte passes extra props silently — the component must be updated to use them when adding DB support.
