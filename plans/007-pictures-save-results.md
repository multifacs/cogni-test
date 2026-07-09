# Plan 007: Save Pictures Exercise Results to DB + Add "Результаты" Button/Page

**Commit:** `4bf31cc`
**Status:** TODO
**Effort:** Medium
**Depends on:** Plan 001 (done — provides exercise route infrastructure)

## Problem

The pictures exercise (`src/lib/exercises/pictures/`) collects `PicturesResult` data (score, maxScore, normalizedScore, and per-question answer records) but:
1. Never persists results to the database
2. Uses deprecated `createEventDispatcher` instead of callback props
3. Shows inline result cards in Playground instead of navigating to a dedicated results page
4. Has no "Результаты" button after game completion

The attention exercise already implements this full flow and is the reference pattern.

## Current State

### Pictures exercise files

| File | Current behavior |
|------|-----------------|
| `types.ts` | Defines `AnswerRecord = { questionId, answer, isCorrect, reactionTimeMs }` and `PicturesResult = { score, maxScore, normalizedScore, answers }` |
| `PicturesGame.svelte` | Uses deprecated `createEventDispatcher<{ done: PicturesResult }>()`; dispatches when all questions answered or observation step finishes; has no finished-phase UI — game just stops rendering |
| `Playground.svelte` | Listens to `done` event via Svelte 4 `on:done={handleDone}` syntax; shows inline result cards (Правильных / Точность) + "Пройти заново" reload button |
| `About.svelte` | Static description text |

### Already-done infrastructure from Plans 001–006

- The route page at `exercises/[slug]/playground/+page.svelte` already passes `gameEnd` / `sendResults` props and shows conditional "Результаты" button based on `exercise?.result`
- The POST handler at `exercises/[slug]/playground/+server.ts` already includes `'pictures'` in its `EXERCISES_WITH_RESULTS` set (line 15)
- The GET endpoint at `exercises/[slug]/results/+server.ts` already includes `'pictures'` in its `EXERCISES_WITH_RESULTS` set (line 12)
- The SSR loader at `exercises/[slug]/results/+page.server.ts` already includes `'pictures'` in its `EXERCISES_WITH_RESULTS` set (line 11)
- The type `'pictures'` is already registered in `ExerciseType`, `ExerciseResultMap`, `ExerciseResult`, and `ExerciseResults` unions in `src/lib/exercises/types.ts`

**Steps that can be skipped compared to plan 001:**
- Step 3 (add ExerciseType) — already done
- Step 7/9 (extend route server handlers) — already done, `'pictures'` is already included

### Not yet done for pictures

- No `picturesAttempt` DB table exists
- `picturesAttempt` is not registered in `attemptTableMap` or `queryTableMap` in the result controller
- No `result` loader registered for pictures in `exerciseLoaders`
- No `Result.svelte` component exists
- `PicturesGame.svelte` still uses `createEventDispatcher`
- `Playground.svelte` still uses Svelte 4 event listener pattern + inline results

## Design Decisions

1. **Follow the attention pattern exactly** — callback props on game component, thin forwarding wrapper in Playground, route page owns POST/navigation
2. **`answers[]` array is not persisted to a separate table** — it contains variable-length per-question detail. For MVP, store only the summary metrics (`score`, `maxScore`, `normalizedScore`). This matches how other exercises handle nested data (e.g., numbers excludes `reviews[]`, raven uses a special `ravenAnswer` table but that was a more complex case). If per-question detail is needed later, add a `pictures_answer` table.
3. **`normalizedScore` is persisted as an integer column** — it's computed as `Math.round((score / maxScore) * 100)` so it's always 0–100. Storing it avoids recomputation and makes queries simpler.
4. **Result component shows 3 metric cards**: Правильных (score / maxScore), Точность (normalizedScore%), and optionally average reaction time. Cards match existing exercise Result components.

## Step-by-step Implementation

### Step 1: Add `picturesAttempt` table to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `ravenAnswer` definition (end of file):

```ts
export const picturesAttempt = sqliteTable('pictures_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	score: integer('score').notNull(),
	maxScore: integer('max_score').notNull(),
	normalizedScore: integer('normalized_score').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- Column names use `snake_case` in SQLite while TypeScript uses `camelCase`. Drizzle maps these automatically via the first argument to `integer()`.
- `attempt` uses `.default(1).notNull()` — same pattern as all other exercise attempt tables. Since `PicturesResult` doesn't include an `attempt` field, the default prevents NULL constraint violations when `postResult` spreads the result object.
- `answers[]` is excluded from this table (see Design Decision #2).

**Verification:** File compiles with `npm run check`.

### Step 2: Register `picturesAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Add `picturesAttempt` to the import from exercises model (line 13–20):

Current:
```ts
import {
	attentionAttempt,
	emojiAttempt,
	flankerAttempt,
	lettersAttempt,
	numbersAttempt,
	ravenAttempt
} from '$lib/server/db/models/exercises';
```

Updated:
```ts
import {
	attentionAttempt,
	emojiAttempt,
	flankerAttempt,
	lettersAttempt,
	numbersAttempt,
	picturesAttempt,
	ravenAttempt
} from '$lib/server/db/models/exercises';
```

2. In `attemptTableMap` (line 33–48), add `'pictures'`:

```ts
const attemptTableMap: Record<string, any> = {
	math: mathAttempt,
	stroop: stroopAttempt,
	memory: memoryAttempt,
	swallow: swallowAttempt,
	munsterberg: munsterbergAttempt,
	campimetry: campimetryAttempt,
	rhythm: rhythmAttempt,
	memoryMatch: memoryMatchAttempt,
	attention: attentionAttempt,
	emoji: emojiAttempt,
	flanker: flankerAttempt,
	letters: lettersAttempt,
	numbers: numbersAttempt,
	pictures: picturesAttempt,
	ravenMatrices: ravenAttempt
};
```

3. In `queryTableMap` (line 50–65), add `'pictures'`:

```ts
const queryTableMap: Record<string, any> = {
	math: db.query.mathAttempt,
	stroop: db.query.stroopAttempt,
	memory: db.query.memoryAttempt,
	swallow: db.query.swallowAttempt,
	munsterberg: db.query.munsterbergAttempt,
	campimetry: db.query.campimetryAttempt,
	rhythm: db.query.rhythmAttempt,
	memoryMatch: db.query.memoryMatchAttempt,
	attention: db.query.attentionAttempt,
	emoji: db.query.emojiAttempt,
	flanker: db.query.flankerAttempt,
	letters: db.query.lettersAttempt,
	numbers: db.query.numbersAttempt,
	pictures: db.query.picturesAttempt,
	ravenMatrices: db.query.ravenAttempt
};
```

**Verification:** `npm run check` passes.

### Step 3: Update `PicturesGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/pictures/PicturesGame.svelte`

Replace the script section:

Current (lines 1–208):
```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { PicturesResult, AnswerRecord } from './types';

	type Option = { value: string; label: string; correct?: boolean };
	type Question = {
		id: number;
		kind: 'binary' | 'choice' | 'observe';
		prompt: string;
		helper: string;
		image?: string;
		imageAlt?: string;
		options?: Option[];
		scored: boolean;
		buttonLabel?: string;
	};

	const dispatch = createEventDispatcher<{ done: PicturesResult }>();

	// ...questions array, state variables...

	const answerQuestion = (value: string) => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;
		answers = { ...answers, [question.id]: value };
		answerTimings = { ...answerTimings, [question.id]: reactionTimeMs };
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			questionShownAt = Date.now();
		} else {
			finished = true;
			dispatch('done', {
				score: score(),
				maxScore: recallQuestions.length,
				normalizedScore: Math.round((score() / recallQuestions.length) * 100),
				answers: questions.map((q) => {
					const selectedValue = answers[q.id];
					const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
					return {
						questionId: String(q.id),
						answer: selectedValue ?? undefined,
						isCorrect: q.scored ? Boolean(option?.correct) : null,
						reactionTimeMs: answerTimings[q.id] ?? 0
					};
				})
			});
		}
	};

	const advanceObservation = () => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;
		answers = { ...answers, [question.id]: 'seen' };
		answerTimings = { ...answerTimings, [question.id]: reactionTimeMs };
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			questionShownAt = Date.now();
		} else {
			finished = true;
			dispatch('done', {
				score: score(),
				maxScore: recallQuestions.length,
				normalizedScore: Math.round((score() / recallQuestions.length) * 100),
				answers: []
			});
		}
	};
</script>
```

With:
```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { PicturesResult, AnswerRecord } from './types';

	type Option = { value: string; label: string; correct?: boolean };
	type Question = {
		id: number;
		kind: 'binary' | 'choice' | 'observe';
		prompt: string;
		helper: string;
		image?: string;
		imageAlt?: string;
		options?: Option[];
		scored: boolean;
		buttonLabel?: string;
	};

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: PicturesResult[]) => void;
	} = $props();

	// ...all questions, state, helper functions stay exactly the same...

	const answerQuestion = (value: string) => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;
		answers = { ...answers, [question.id]: value };
		answerTimings = { ...answerTimings, [question.id]: reactionTimeMs };
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			questionShownAt = Date.now();
		} else {
			finished = true;
			sendResults([{
				score: score(),
				maxScore: recallQuestions.length,
				normalizedScore: Math.round((score() / recallQuestions.length) * 100),
				answers: questions.map((q) => {
					const selectedValue = answers[q.id];
					const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
					return {
						questionId: String(q.id),
						answer: selectedValue ?? undefined,
						isCorrect: q.scored ? Boolean(option?.correct) : null,
						reactionTimeMs: answerTimings[q.id] ?? 0
					};
				})
			}]);
			gameEnd();
		}
	};

	const advanceObservation = () => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;
		answers = { ...answers, [question.id]: 'seen' };
		answerTimings = { ...answerTimings, [question.id]: reactionTimeMs };
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			questionShownAt = Date.now();
		} else {
			finished = true;
			sendResults([{
				score: score(),
				maxScore: recallQuestions.length,
				normalizedScore: Math.round((score() / recallQuestions.length) * 100),
				answers: []
			}]);
			gameEnd();
		}
	};
</script>
```

Key changes:
- Remove `import { createEventDispatcher } from 'svelte'`
- Remove `const dispatch = createEventDispatcher<{ done: PicturesResult }>()`
- Add `gameEnd` and `sendResults` as `$props()`
- Replace both `dispatch('done', {...})` calls with `sendResults([{...}])` followed by `gameEnd()`
- Everything else (questions array, state variables, helper functions, template markup) stays exactly the same

**Verification:** Game renders but cannot be completed yet until Playground is updated in next step.

### Step 4: Update `Playground.svelte` — forward callback props

**File:** `src/lib/exercises/pictures/Playground.svelte`

Replace the entire file with:

```svelte
<script lang="ts">
	import PicturesGame from './PicturesGame.svelte';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: any[]) => void;
	} = $props();
</script>

<PicturesGame {gameEnd} {sendResults} />
```

This matches the thin forwarding pattern used by all other exercise Playgrounds that have been migrated. All previous inline result display logic (stats grid with Правильных/Точность cards, "Пройти заново" button) is removed because the dedicated Result.svelte page handles display now.

### Step 5: Register `result` loader for pictures in the exercise registry

**File:** `src/lib/exercises/index.ts`

Update the `pictures` entry in `exerciseLoaders` (currently lines 129–132):

Current:
```ts
pictures: {
	about: () => import('./pictures/About.svelte'),
	playground: () => import('./pictures/Playground.svelte')
},
```

Updated:
```ts
pictures: {
	about: () => import('./pictures/About.svelte'),
	playground: () => import('./pictures/Playground.svelte'),
	result: () => import('./pictures/Result.svelte')
},
```

Adding `result` signals to the route page that this exercise supports DB persistence and should receive `sendResults` + show the "Результаты" button.

**Verification:** `npm run check` passes.

### Step 6: Create `Result.svelte` for pictures

**New file:** `src/lib/exercises/pictures/Result.svelte`

Self-contained result display component. Follows the same pattern as `src/lib/exercises/emoji/Result.svelte` — accepts `{ slug }`, fetches own data via the GET endpoint, renders accordion UI with metric cards.

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { PicturesResult } from './types';
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
								{@const attempt = attempt_raw as PicturesResult}
								<div class="grid grid-cols-3 gap-4 py-2">
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Правильных</span>
										<strong class="text-2xl">{attempt.score}/{attempt.maxScore}</strong>
									</div>
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Максимум</span>
										<strong class="text-2xl">{attempt.maxScore}</strong>
									</div>
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Точность</span>
										<strong class="text-2xl">{attempt.normalizedScore}%</strong>
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
		<Button color="red" goto="/exercises/pictures">Назад</Button>
		<Button color="blue" goto="/exercises/pictures/playground">Пройти снова</Button>
	</section>
{:else}
	<main class="main box-border">
		<h1>Попыток нет</h1>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/pictures">Назад</Button>
		<Button color="blue" goto="/exercises/pictures/playground">Пройти снова</Button>
	</section>
{/if}
```

Displays three cards per attempt row matching what the old inline Playground showed plus maximium score:
- **Правильных** — `score/maxScore`
- **Максимум** — `maxScore`
- **Точность** — `normalizedScore%`

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `picturesAttempt` table after `ravenAnswer` |
| `src/lib/server/db/controllers/result.ts` | Edit — import `picturesAttempt`, register in both lookup maps |
| `src/lib/exercises/pictures/PicturesGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props |
| `src/lib/exercises/pictures/Playground.svelte` | Edit — forward `gameEnd`/`sendResults` props, remove inline results display |
| `src/lib/exercises/pictures/Result.svelte` | **New** — self-contained result display (accordion + Правильных/Максимум/Точность cards) |
| `src/lib/exercises/index.ts` | Edit — add `result` loader for `pictures` entry |

No new route files needed — the shared `[slug]` routes already exist and `'pictures'` is already in their allowed slugs sets from prior plans.

No changes to `src/lib/exercises/types.ts` — `'pictures'` and `PicturesResult` are already registered in all type unions.

No changes to `+server.ts` / `+page.server.ts` — `'pictures'` is already in their `EXERCISES_WITH_RESULTS` arrays.

## Files Explicitly Out of Scope

- Any other exercise besides pictures
- Persisting `answers[]` (per-question detail) to a separate DB table — see Design Decision #2
- Chart.js visualization across sessions — card-based display is sufficient for MVP
- Svelte 5 migration of other exercises (besides PicturesGame's createEventDispatcher removal)
- Refactoring the three `+server.ts`/`+page.server.ts` slug checks into a shared utility

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. Schema push: `npx cross-env DATABASE_URL=file:sqlite.db npx drizzle-kit push --force` then verify:
   ```sql
   SELECT sql FROM sqlite_master WHERE name='pictures_attempt';
   ```
   Should return a CREATE TABLE statement with columns: `id, attempt, score, max_score, normalized_score, session_id, created_at`.
4. Manual E2E flow:
   - Navigate to `/exercises/pictures/about`
   - Start a game, complete all 10 questions
   - Verify: page navigates to `/exercises/pictures/results`
   - Verify: browser DevTools shows POST `/exercises/pictures/playground` returns 201
   - Verify: results page shows accordion entry with date, expands to show Правильных/Максимум/Точность cards
   - Click "Назад", start another round, complete again
   - Go back to results → two accordion entries visible
5. Regression check for other exercises:
   - Open `/exercises/attention/playground`, confirm behavior unchanged
   - Bottom buttons show correct layout during play vs. after game end

## Maintenance Notes

- Adding per-question detail persistence later would require a new `pictures_answer` table referencing `picturesAttempt.id`, similar to `ravenAnswer` → `ravenAttempt`.
- The `ExerciseType` union and `postResult`/`getResults` lookup maps must stay in sync with DB tables — `picturesAttempt` is now registered in all three places (table map, query map, type union).
- The `attempt=1` default convention means each completed game is one row. If multi-round sessions are added later, increment `attempt` per round and group by `sessionId`.
- The `exercise?.result` check drives the "Результаты" button and `sendResults` prop — pictures now has this registered, so it will automatically receive the correct behavior from the shared route page.
- This plan addresses the `createEventDispatcher` deprecation only for `PicturesGame.svelte`. Other exercises may still use it.

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead (it uses cross-env to set DATABASE_URL).
- If the user doesn't have a `user_id` cookie (not logged in), `postResult` will receive `undefined` as `userId` which violates the NOT NULL constraint on `session.userId`. The existing routes have the same behavior — this is a pre-existing issue, not introduced by this plan. If blocking, add a guard: `if (!userId) return json({ error: 'unauthorized' }, { status: 401 });` in the POST handler.
- If an exercise Playground component doesn't accept `sendResults`/`gameEnd` props yet, it simply won't receive them — TypeScript won't error because Svelte passes extra props silently. The component must be updated to use them when adding DB support for that exercise.
