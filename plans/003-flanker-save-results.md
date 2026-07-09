# Plan 003: Save Flanker Exercise Results to DB + Add "Результаты" Button/Page

**Status:** TODO
**Effort:** Medium
**Depends on:** Plan 001 (done — provides exercise route infrastructure)

## Problem

The flanker exercise (`src/lib/exercises/flanker/`) collects `FlankerResult` data (`correctAnswers`, `totalTrials`, `elapsedTime`, `timeLimit`, `avgRtCongruentMs`, `avgRtIncongruentMs`, `flankerEffectMs`, `errors`) but:
1. Never persists results to the database
2. Uses deprecated `createEventDispatcher` instead of callback props
3. Shows inline result cards in Playground instead of navigating to a dedicated results page
4. Has no "Результаты" button after game completion

The attention exercise already implements this full flow and is the reference pattern.

## Current State

### Flanker exercise files
| File | Current behavior |
|------|-----------------|
| `types.ts` | Defines `FlankerResult = { correctAnswers, totalTrials, elapsedTime, timeLimit, avgRtCongruentMs, avgRtIncongruentMs, flankerEffectMs, errors }` |
| `FlankerGame.svelte` | Uses deprecated `createEventDispatcher<{ done: FlankerResult }>()`; dispatches on test completion (all trials answered or time limit reached); also has internal `restartTest()` and post-finish result display |
| `Playground.svelte` | Listens to `done` event via `on:done`, shows inline result cards (Верно/Время/Ошибки/Flanker-эффект) + "Пройти заново" button |
| `About.svelte` | Static description text |

### Already-done infrastructure from Plans 001 & 002
- The route page at `exercises/[slug]/playground/+page.svelte` already passes `gameEnd` / `sendResults` props and shows conditional "Результаты" button based on `exercise?.result`
- The POST handler at `exercises/[slug]/playground/+server.ts` exists with an allow-list of supported slugs (`['attention', 'emoji']`)
- The GET endpoint at `exercises/[slug]/results/+server.ts` exists with the same allow-list pattern
- The SSR loader at `exercises/[slug]/results/+page.server.ts` exists with the same allow-list pattern
- The results page at `exercises/[slug]/results/+page.svelte` dynamically loads the Result component from `exercise.result()`

## Design Decisions

1. **Follow the attention/emoji pattern exactly** — callback props on game component, thin forwarding wrapper in Playground, route page owns POST/navigation
2. **Persist all summary metrics to DB** — unlike emoji's `trialLog` which was excluded, `FlankerResult` only contains summary metrics that map cleanly to flat columns. All 8 fields will be persisted.
3. **`timeLimit` stored as boolean integer** — SQLite has no native boolean; store as `integer` with mode `'boolean'` (Drizzle convention used elsewhere in this schema).
4. **Add `'flanker'` as a valid `ExerciseType`** — just like `'attention'` and `'emoji'`
5. **Extend existing route server handlers** to accept `'flanker'` alongside `'attention'` and `'emoji'` — no new route files needed
6. **Result component shows 4 metric cards**: Верно (correctAnswers/totalTrials), Время (elapsedTime сек), Ошибки (errors), Flanker-эффект (flankerEffectMs мс). The congruent/incongruent RT breakdown can be added later if desired.

## Step-by-step Implementation

### Step 1: Add `flankerAttempt` table to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `attentionAttempt` definition:

```ts
export const flankerAttempt = sqliteTable('flanker_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	correctAnswers: integer('correct_answers').notNull(),
	totalTrials: integer('total_trials').notNull(),
	elapsedTime: integer('elapsed_time').notNull(),
	timeLimit: integer('time_limit', { mode: 'boolean' }).notNull(),
	avgRtCongruentMs: integer('avg_rt_congruent_ms').notNull(),
	avgRtIncongruentMs: integer('avg_rt_incongruent_ms').notNull(),
	flankerEffectMs: integer('flanker_effect_ms').notNull(),
	errors: integer('errors').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- `attempt` uses `.default(1).notNull()` (same pattern as `attentionAttempt`) because `FlankerResult` has no `attempt` field — Drizzle would send `null` otherwise → NOT NULL violation.
- `timeLimit` uses `{ mode: 'boolean' }` so Drizzle handles the JS `true/false` ↔ SQLite `1/0` mapping.
- Re-exported automatically via existing `export * from './models/exercises'` in `schema.ts`.

### Step 2: Register `flankerAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Update import:
```ts
import { attentionAttempt, flankerAttempt } from '$lib/server/db/models/exercises';
```

(Assumes Plan 002 already changed this to `import { attentionAttempt, emojiAttempt } from ...`; adjust accordingly — just add `flankerAttempt` to whatever imports exist from that module.)

2. In `postResult()`, add `'flanker'` to `insertAttempt` map:
```ts
const insertAttempt = {
    // ...existing...
    attention: attentionAttempt,
    flanker: flankerAttempt
}[testType];
```

3. In `getResults()`, add `'flanker'` to `attemptTable` map:
```ts
const attemptTable = {
    // ...existing...
    attention: db.query.attentionAttempt,
    flanker: db.query.flankerAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

### Step 3: Add `'flanker'` as a valid `ExerciseType`

**File:** `src/lib/exercises/types.ts`

1. Import `FlankerResult`:
```ts
import type { FlankerResult } from '$lib/exercises/flanker/types';
```

2. Extend `ExerciseType`:
```ts
export type ExerciseType =
    | 'attention'
    | 'emoji'
    | 'flanker';
```

3. Extend `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    emoji: EmojiResult;
    flanker: FlankerResult;
};
```

4. Extend `ExerciseResult` and `ExerciseResults` unions:
```ts
export type ExerciseResult =
    | AttentionResult
    | EmojiResult
    | FlankerResult;

export type ExerciseResults =
    | AttentionResult[]
    | EmojiResult[]
    | FlankerResult[];
```

Note: If Plan 002 has already been applied, include `EmojiResult` in both unions as well.

### Step 4: Update `FlankerGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/flanker/FlankerGame.svelte`

Replace the dispatcher pattern with props:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { FlankerResult } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: FlankerResult[]) => void;
	} = $props();

	const TOTAL_TRIALS = 50;
	const MAX_TEST_SECONDS = 120;

	// ...existing state stays the same...

	function finishTest() {
		if (testFinished) return;
		stopTimer();
		testFinished = true;
		currentTrial = null;

		const congruentRts = answerLog.filter((a) => a.congruent).map((a) => a.reactionTimeMs);
		const incongruentRts = answerLog.filter((a) => !a.congruent).map((a) => a.reactionTimeMs);
		const avg = (arr: number[]) =>
			arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
		const avgRtCongruentMs = Math.round(avg(congruentRts));
		const avgRtIncongruentMs = Math.round(avg(incongruentRts));
		const errors = answerLog.filter((a) => !a.isCorrect).length;

		sendResults([{
			correctAnswers,
			totalTrials: TOTAL_TRIALS,
			elapsedTime,
			timeLimit,
			avgRtCongruentMs,
			avgRtIncongruentMs,
			flankerEffectMs: avgRtIncongruentMs - avgRtCongruentMs,
			errors
		}]);
		gameEnd();
	}

	// Remove restartTest() — navigation is handled by the route page now.
</script>
```

Key changes:
- Remove `createEventDispatcher` import and usage
- Add `gameEnd` and `sendResults` as `$props()`
- Call `sendResults([...])` then `gameEnd()` instead of `dispatch('done', ...)`
- Remove `restartTest()` function (the route page's "Результаты"/"Назад" buttons handle navigation)
- Keep all other logic identical (trial generation, answer handling, timer)

The markup after `testFinished` should be simplified to remove the post-finish display (stats cards + "Пройти заново") since those are handled by the results page:

Replace lines 183–205 (`{:else if testFinished}` block) with:
```svelte
{:else if testFinished}
	<div class="flex flex-col items-center justify-center gap-3">
		<p class="text-lg font-semibold text-white">Тест завершён</p>
	</div>
```

The full results are shown on `/exercises/flanker/results`. This removes the duplicated inline stats cards and "Пройти заново" button.

### Step 5: Update `Playground.svelte` — forward props, remove inline results

**File:** `src/lib/exercises/flanker/Playground.svelte`

Replace entire file:

```svelte
<script lang="ts">
	import FlankerGame from './FlankerGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<FlankerGame {gameEnd} {sendResults} />
```

This mirrors `attention/Playground.svelte` exactly. All inline result display ("Пройти заново", score/time/errors/flanker-effect cards) is removed — the route page handles post-game navigation now.

### Step 6: Add `result` loader to flanker entry in exercise registry

**File:** `src/lib/exercises/index.ts`

Update the flanker loader entry:

```ts
flanker: {
    about: () => import('./flanker/About.svelte'),
    playground: () => import('./flanker/Playground.svelte'),
    result: () => import('./flanker/Result.svelte')
},
```

Adding the `result` lazy loader makes `exercise?.result` truthy for flanker, which means:
- The playground route page will pass `sendResults` prop
- The "Результаты" button will appear after game end
- On game end, page navigates to `/exercises/flanker/results`

### Step 7: Update route server handlers to support `'flanker'`

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Add `'flanker'` to the allow-list:

```ts
const EXERCISES_WITH_RESULTS = ['attention', 'emoji', 'flanker'];

if (!EXERCISES_WITH_RESULTS.includes(slug)) {
    return json({ error: 'unknown exercise' }, { status: 400 });
}
const { results }: { results: ExerciseResults | MetaResult } = await request.json();
const userId = cookies.get('user_id') as string;

await postResult(results, slug as AnySessionType, userId);
return json('success', { status: 201 });
```

Note: Using `slug as AnySessionType` (where `AnySessionType = TestType | ExerciseType`) avoids hard-coding per-exercise calls. Extracting to a constant array makes it easy to add future exercises.

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

Same pattern:

```ts
const EXERCISES_WITH_RESULTS = ['attention', 'emoji', 'flanker'];

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
const EXERCISES_WITH_RESULTS = ['attention', 'emoji', 'flanker'];

if (!EXERCISES_WITH_RESULTS.includes(slug)) {
    return { results: [] };
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return { results };
```

Consider extracting the `EXERCISES_WITH_RESULTS` constant to a shared location (e.g., `$lib/exercises/constants.ts`) if duplication becomes burdensome. For now, three copies are manageable.

### Step 8: Create `Result.svelte` for the flanker exercise

**New file:** `src/lib/exercises/flanker/Result.svelte`

Self-contained result display component, modeled after `attention/Result.svelte`. Fetches its own data via the GET endpoint, renders accordion UI with 4 metric cards plus navigation buttons:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { FlankerResult } from './types';
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
								{@const attempt = attempt_raw as FlankerResult}
								<div class="grid grid-cols-2 gap-4 py-2">
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Верно</span>
										<strong class="text-2xl">{attempt.correctAnswers} / {attempt.totalTrials}</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Время</span>
										<strong class="text-2xl">{attempt.elapsedTime} сек</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Ошибки</span>
										<strong class="text-2xl">{attempt.errors}</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Flanker-эффект</span>
										<strong class="text-2xl">{attempt.flankerEffectMs} мс</strong>
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
		<Button color="red" goto="/exercises/flanker">Назад</Button>
		<Button color="blue" goto="/exercises/flanker/playground">Пройти снова</Button>
	</section>
{:else}
	<main class="main box-border">
		<h1>Попыток нет</h1>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/flanker">Назад</Button>
		<Button color="blue" goto="/exercises/flanker/playground">Пройти снова</Button>
	</section>
{/if}
```

Uses a 2×2 grid layout for 4 metric cards: Верно (correctAnswers/totalTrials), Время (elapsedTime сек), Ошибки (errors), Flanker-эффект (flankerEffectMs мс). Same accordion pattern as attention Result.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `flankerAttempt` table |
| `src/lib/server/db/controllers/result.ts` | Edit — import `flankerAttempt`, register in both maps |
| `src/lib/exercises/types.ts` | Edit — add `'flanker'` to `ExerciseType`, `ExerciseResult`, `ExerciseResults`, `ExerciseResultMap`; import `FlankerResult` |
| `src/lib/exercises/index.ts` | Edit — add `result` loader to flanker entry |
| `src/lib/exercises/flanker/FlankerGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props; remove `restartTest()` and post-finish inline display |
| `src/lib/exercises/flanker/Playground.svelte` | Edit — forward props, remove inline result display |
| `src/lib/exercises/flanker/Result.svelte` | **New** — self-contained result display component |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | Edit — add `'flanker'` to slug allow-list |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | Edit — add `'flanker'` to slug allow-list |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | Edit — add `'flanker'` to slug allow-list |

No new route files needed — the existing route infrastructure from Plan 001 handles everything.

## Files Explicitly Out of Scope

- Any other exercise besides flanker
- The test routes under `src/routes/(app)/tests/`
- Svelte 5 migration of other exercises (besides FlankerGame's `createEventDispatcher` removal)
- Chart.js visualizations (card-based display is sufficient for MVP)
- Congruent/incongruent RT breakdown cards in the Result component (can be added later)
- Per-trial reaction time persistence (would require a separate `flanker_trial` detail table)

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. `npm run build` — succeeds
4. Schema push: `npm run init-db-dev`, then verify table exists:
   ```
   npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='flanker_attempt';"
   ```
5. Manual E2E flow:
   - Navigate to `/exercises/flanker/about`
   - Start a game, answer all 50 trials (or let time expire)
   - Verify: browser DevTools shows POST `/exercises/flanker/playground` returns 201
   - Verify: page navigates to `/exercises/flanker/results`
   - Verify: results page shows accordion entry with date, expands to show Верно/Время/Ошибки/Flanker-эффект cards
   - Click "Пройти снова", complete another round
   - Go back to results → two accordion entries visible
6. Regression check for other exercises:
   - Open `/exercises/word-morphing/playground`, confirm it loads without error
   - Bottom buttons still show 3-col layout during play and after game end
7. Regression check for attention exercise:
   - Open `/exercises/attention/playground`, complete a game
   - Verify results still save and show correctly

## Maintenance Notes

- Adding DB persistence for another exercise follows the exact same pattern: add table to `models/exercises.ts` → register in controller maps → add to `ExerciseType` union → add `result` loader to `exerciseLoaders` → create self-contained `Result.svelte` → update Playground to accept `gameEnd`/`sendResults` props → extend the slug allow-list in route handlers.
- The `ExerciseType` union and result controller lookup maps must stay in sync with DB tables — if you add an exercise table, update all three places. The controller uses `AnySessionType = TestType | ExerciseType`.
- The `attempt=1` default convention means each completed game is one row. If multi-round sessions are added later, increment `attempt` per round and group by `sessionId`.
- The `exercise?.result` check drives the "Результаты" button visibility — exercises without a `result` loader still work exactly as before.
- Consider extracting `EXERCISES_WITH_RESULTS` to a shared constant if more exercises are added.
- This plan addresses the `createEventDispatcher` deprecation only for `FlankerGame.svelte`. Other exercises still use it.

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead.
- If the user doesn't have a `user_id` cookie (not logged in), `postResult` will receive `undefined` as `userId` which violates the NOT NULL constraint on `session.userId`. Same pre-existing issue as all tests/exercises routes.
- If an exercise Playground component doesn't accept `sendResults`/`gameEnd` props yet, Svelte passes extra props silently — the component must be updated to use them when adding DB support.
