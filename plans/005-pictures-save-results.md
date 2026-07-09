# Plan 005: Save Pictures Exercise Results to DB + Show Results

**Status:** TODO
**Effort:** Medium
**Depends on:** Plan 001 (attention exercise — establishes the pattern)

## Problem

The pictures exercise (`src/lib/exercises/pictures/`) collects `PicturesResult` data (`{ score, maxScore, normalizedScore, answers }`) but never persists it to the database or shows historical results. The Playground component currently uses the deprecated `createEventDispatcher` and shows inline result cards with no DB write.

This plan follows the exact same pattern established in Plan 001 for the attention exercise: route page owns POST/save via callback props, exercise components are pure UI.

## Current State

### Pictures exercise (no DB saving)

- **Game component:** `src/lib/exercises/pictures/PicturesGame.svelte`
  - Uses deprecated `createEventDispatcher<{ done: PicturesResult }>()` (line 2, 19)
  - Dispatches `{ score, maxScore, normalizedScore, answers }` when all questions answered (lines 173–188, 200–207)
  - Two dispatch sites: `answerQuestion()` (line 173) and `advanceObservation()` (line 201)
- **Playground wrapper:** `src/lib/exercises/pictures/Playground.svelte`
  - Listens to `done` event via `on:done={handleDone}` (line 17)
  - Shows inline result cards (score/accuracy) and "Пройти заново" button
  - No DB write, no navigation to results page
- **Type:** `src/lib/exercises/pictures/types.ts` — `PicturesResult = { score, maxScore, normalizedScore, answers: AnswerRecord[] }` where `AnswerRecord = { questionId, answer, isCorrect, reactionTimeMs }`
- **Exercise registry entry** (`src/lib/exercises/index.ts:125-128`): Has `about` and `playground`, no `result` loader

### Existing infrastructure (from Plan 001)

The attention exercise already established all the plumbing:
- Route page at `src/routes/(app)/exercises/[slug]/playground/+page.svelte` already passes `gameEnd` and `sendResults` props conditionally based on `exercise?.result`
- POST handler at `src/routes/(app)/exercises/[slug]/playground/+server.ts` only supports `'attention'` slug — needs `'pictures'` added
- Results page server load at `src/routes/(app)/exercises/[slug]/results/+page.server.ts` only supports `'attention'` — needs `'pictures'` added
- Results GET API at `src/routes/(app)/exercises/[slug]/results/+server.ts` only supports `'attention'` — needs `'pictures'` added
- Results page at `src/routes/(app)/exercises/[slug]/results/+page.svelte` dynamically loads from `exercise.result()` — works automatically once loader is registered

## Design Decision

Follow the exact same pattern as Plan 001 (attention exercise):

1. Add `picturesAttempt` table to `models/exercises.ts`
2. Register in `postResult` / `getResults` controller maps
3. Add `'pictures'` to `ExerciseType` and related type unions
4. Replace `createEventDispatcher` in `PicturesGame.svelte` with `gameEnd`/`sendResults` callback props
5. Simplify `Playground.svelte` to forward props (remove inline results display)
6. Extend existing route handlers (POST server, GET server, page server) to support `'pictures'` slug
7. Create self-contained `Result.svelte` that fetches its own data and renders accordion UI
8. Register `result` loader on the pictures entry in `exerciseLoaders`

Key difference from attention: The `PicturesResult.answers` field is an array of `AnswerRecord` objects. These need their own table since SQLite doesn't support nested JSON columns natively — we'll store them as a single JSON text column on the attempt row for simplicity (matching how other exercises handle complex result data). Alternatively, a separate `pictures_answer` table could be used, but that adds complexity with no current benefit since answers are always read/written as a batch per attempt.

## Step-by-step Implementation

### Step 1: Add `picturesAttempt` table to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `attentionAttempt` table:

```ts
export const picturesAttempt = sqliteTable('pictures_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	score: integer('score').notNull(),
	maxScore: integer('max_score').notNull(),
	normalizedScore: integer('normalized_score').notNull(),
	answers: text('answers').notNull(), // JSON stringified AnswerRecord[]
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- `attempt: integer('attempt').default(1).notNull()` — same pattern as attention; `PicturesResult` has no `attempt` field, so the default fills it in during spread insert.
- `answers` stored as JSON text because Drizzle doesn't have a native array/object column type for SQLite, and the answers are always read/written as a complete set per attempt.
- Import `AnswerRecord` type is NOT needed here — the table stores raw JSON strings; deserialization happens in the Result component.

No changes needed to `schema.ts` — it already has `export * from './models/exercises'`.

### Step 2: Register `picturesAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Add import:
```ts
import { attentionAttempt, picturesAttempt } from '$lib/server/db/models/exercises';
```

2. In `postResult()`, add `'pictures'` to the `insertAttempt` map:
```ts
const insertAttempt = {
    math: mathAttempt,
    stroop: stroopAttempt,
    memory: memoryAttempt,
    swallow: swallowAttempt,
    munsterberg: munsterbergAttempt,
    campimetry: campimetryAttempt,
    rhythm: rhythmAttempt,
    memoryMatch: memoryMatchAttempt,
    attention: attentionAttempt,
    pictures: picturesAttempt
}[testType];
```

3. In `getResults()`, add `'pictures'` to the `attemptTable` map:
```ts
const attemptTable = {
    math: db.query.mathAttempt,
    stroop: db.query.stroopAttempt,
    memory: db.query.memoryAttempt,
    swallow: db.query.swallowAttempt,
    munsterberg: db.query.munsterbergAttempt,
    campimetry: db.query.campimetryAttempt,
    rhythm: db.query.rhythmAttempt,
    memoryMatch: db.query.memoryMatchAttempt,
    attention: db.query.attentionAttempt,
    pictures: db.query.picturesAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

**Important:** The `postResult` controller spreads result objects into the Drizzle insert via `.values(attempts.map(attempt => ({ ...attempt, sessionId })))`. Since `PicturesResult.answers` is an `AnswerRecord[]` but the DB column is `text`, we need to serialize answers before they reach the controller.

Two approaches:
- **Option A (preferred):** Have `PicturesGame.svelte` send pre-serialized results where `answers` is already a JSON string. This means `sendResults` receives objects with `answers: string` instead of `answers: AnswerRecord[]`.
- **Option B:** Add a serialization step inside the route's POST handler before calling `postResult`.
- **Option C:** Create a separate `PicturesDBResult` type that mirrors `PicturesResult` but with `answers: string`.

Going with **Option A**: The game component creates the result object with `answers: JSON.stringify(answerRecords)` before passing to `sendResults`. This keeps the controller generic and avoids adding exercise-specific logic to shared code. We'll define a helper type:

```ts
// In src/lib/exercises/pictures/types.ts
export type PicturesDBResult = Omit<PicturesResult, 'answers'> & {
    answers: string; // JSON stringified AnswerRecord[]
};
```

**Verification:** `npm run check` passes with no type errors.

### Step 3: Add `'pictures'` as a valid `ExerciseType`

**File:** `src/lib/exercises/types.ts`

1. Add import at top:
```ts
import type { PicturesResult } from '$lib/exercises/pictures/types';
```

2. Add `'pictures'` to `ExerciseType` union:
```ts
export type ExerciseType =
    | 'attention'
    | 'pictures';
```

3. Extend `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    pictures: PicturesResult;
};
```

4. Extend `ExerciseResult` and `ExerciseResults`:
```ts
export type ExerciseResult =
    | AttentionResult
    | PicturesResult;

export type ExerciseResults =
    | AttentionResult[]
    | PicturesResult[];
```

**Note:** `PicturesResult` has `answers: AnswerRecord[]` which is fine for the TypeScript types — the DB uses a JSON string column but the TS types describe the logical shape. Serialization happens at the boundary (game → sendResults).

**Verification:** `npm run check` passes.

### Step 4: Update `PicturesGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/pictures/PicturesGame.svelte`

Replace the event dispatcher with callback props, matching the attention game pattern:

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

	// ...existing questions/constants unchanged...

	const recallQuestions = questions.filter((q) => q.scored);

	let currentIndex = $state(0);
	let answers = $state<Record<number, string>>({});
	let finished = $state(false);
	let questionShownAt = $state(Date.now());
	let answerTimings = $state<Record<number, number>>({});

	const currentQuestion = () => questions[currentIndex];

	const optionForValue = (question: Question, value: string) =>
		question.options?.find((o) => o.value === value);

	const score = () =>
		recallQuestions.reduce((total, question) => {
			const selected = answers[question.id];
			if (!selected) return total;
			return optionForValue(question, selected)?.correct ? total + 1 : total;
		}, 0);

	function buildResult(): PicturesResult {
		return {
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
		};
	}

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
			sendResults([buildResult()]);
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
			sendResults([buildResult()]);
			gameEnd();
		}
	};
</script>
```

Changes summary:
- Remove `createEventDispatcher` import and usage
- Add `gameEnd` and `sendResults` props
- Extract inline result construction into `buildResult()` helper (shared by both dispatch sites)
- Replace `dispatch('done', ...)` calls with `sendResults([...]) + gameEnd()` at both sites (line ~173 and line ~201)
- Keep all existing template/style unchanged

**Verification:** Game renders but cannot complete yet until Playground is updated.

### Step 5: Update `Playground.svelte` — forward props from route page

**File:** `src/lib/exercises/pictures/Playground.svelte`

Remove inline result display logic; just forward callback props down to the game component — exactly like attention's Playground:

```svelte
<script lang="ts">
	import PicturesGame from './PicturesGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<PicturesGame {gameEnd} {sendResults} />
```

This removes:
- The `finished` / `finalResult` state variables
- The `handleDone` event handler
- The entire `{#if !finished}...{:else}...{/if}` conditional rendering
- The inline stats display and "Пройти заново" button
- All `<style>` block styles (no longer needed)

After this change, the Playground is a thin pass-through — identical to `src/lib/exercises/attention/Playground.svelte`. Result display moves to the dedicated `/exercises/{slug}/results` page.

**Verification:** Open `/exercises/pictures/playground`. Complete all questions. On completion, `gameEnd()` should fire and navigate to `/exercises/pictures/results` (since we'll register the `result` loader).

### Step 6: Serialize answers for DB storage in the POST handler

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Extend the existing POST handler to also accept `'pictures'` slug, and serialize the `answers` field before inserting:

```ts
import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { ExerciseResults, MetaResult } from '$lib/exercises/types.js';
import type { RequestHandler } from '@sveltejs/kit';

const EXERCISES_WITH_RESULTS = ['attention', 'pictures'] as const;

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug as any)) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}

	const { results }: { results: ExerciseResults | MetaResult } = await request.json();

	// For pictures, serialize the answers array to JSON string for the TEXT column
	if (slug === 'pictures') {
		const serialized = Array.isArray(results)
			? results.map((r: any) => ({
					...r,
					answers: typeof r.answers === 'string' ? r.answers : JSON.stringify(r.answers)
				}))
			: results;
		const userId = cookies.get('user_id') as string;
		await postResult(serialized, 'pictures', userId);
		return json('success', { status: 201 });
	}

	const userId = cookies.get('user_id') as string;
	await postResult(results, slug as any, userId);
	return json('success', { status: 201 });
};
```

This approach serializes `answers` from `AnswerRecord[]` to `string` right before hitting the DB, keeping the game component sending clean typed data through `sendResults`. The `EXERCISES_WITH_RESULTS` constant replaces the hardcoded `'attention'` check so adding future exercises requires only appending to the list.

**Alternative simpler approach:** If we don't want slug-specific logic in the handler, we can have the `PicturesGame` component itself call `JSON.stringify(result.answers)` before passing to `sendResults`. However, this leaks DB concerns into the UI layer. The handler approach is cleaner.

**Verification:** Play through a game, confirm POST returns 201. Check DB: should show one row in `pictures_attempt` with `answers` column containing valid JSON.

### Step 7: Extend results server handlers for `'pictures'`

**File:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

```ts
import { getResults } from '$lib/server/db/controllers/result.js';
import type { PageServerLoad } from './$types';

const EXERCISES_WITH_RESULTS = ['attention', 'pictures'] as const;

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug as any)) {
		return { results: [] };
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(slug as any, userId);
	return { results };
};
```

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

```ts
import { getResults } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const EXERCISES_WITH_RESULTS = ['attention', 'pictures'] as const;

export const GET: RequestHandler = async ({ params, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug as any)) {
		return json({ results: [] });
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(slug as any, userId);
	return json({ results });
};
```

Consider extracting `EXERCISES_WITH_RESULTS` into a shared constant (e.g., `$lib/exercises/constants.ts`) if the repetition becomes bothersome. For now, duplicating across three files is acceptable — same pattern used by the existing code with individual slug checks.

**Verification:** Navigate to `/exercises/pictures/results` after completing a game — page loads without error.

### Step 8: Register `result` loader on pictures exercise

**File:** `src/lib/exercises/index.ts`

Update the pictures entry to include the result lazy loader:

```ts
pictures: {
    about: () => import('./pictures/About.svelte'),
    playground: () => import('./pictures/Playground.svelte'),
    result: () => import('./pictures/Result.svelte')
},
```

This enables:
- The playground route page passes `sendResults={exercise?.result ? onSendResults : undefined}` — pictures will now receive the callback
- After game end, the "Результаты" button appears (because `exercise?.result` is truthy)
- The results page dynamically loads the `Result` component

**Verification:** Open `/exercises/pictures/about`, start the exercise. Confirm bottom buttons show 2-col layout with "Результаты" after completion.

### Step 9: Create `Result.svelte` for the pictures exercise

**New file:** `src/lib/exercises/pictures/Result.svelte`

Self-contained result display component following the same accordion pattern as `attention/Result.svelte`. Fetches own data via GET endpoint, renders sessions in accordions, each showing score/maxScore/normalizedScore cards plus expandable answer details.

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { PicturesResult, AnswerRecord } from './types';
	import type { ResultInfo } from '$lib/exercises/types';

	let { slug }: { slug: string } = $props();

	let results = $state<ResultInfo[]>([]);
	let loading = $state(true);
	let openedSessionId: string | null = $state(null);
	let expandedAnswers = $state<Set<string>>(new Set());

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

	function toggleAnswerDetail(key: string) {
		const next = new Set(expandedAnswers);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expandedAnswers = next;
	}

	function parseAttempt(raw: any): PicturesResult {
		return {
			score: raw.score,
			maxScore: raw.maxScore,
			normalizedScore: raw.normalizedScore,
			answers: typeof raw.answers === 'string' ? JSON.parse(raw.answers) : raw.answers
		};
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
								{@const attempt = parseAttempt(attempt_raw)}
								<div class="grid grid-cols-3 gap-4 py-2">
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Правильных</span>
										<strong class="text-2xl">{attempt.score} / {attempt.maxScore}</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Точность</span>
										<strong class="text-2xl">{attempt.normalizedScore}%</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Ответов</span>
										<strong class="text-2xl">{attempt.answers.length}</strong>
									</div>
								</div>

								<!-- Expandable answer details -->
								<button
									class="mt-1 cursor-pointer text-sm text-blue-300 underline"
									onclick={() => toggleAnswerDetail(`${result.sessionId}-${i}`)}
								>
									{expandedAnswers.has(`${result.sessionId}-${i}`) ? 'Скрыть ответы' : 'Показать ответы'}
								</button>
								{#if expandedAnswers.has(`${result.sessionId}-${i}`)}
									<div class="mt-2 w-full overflow-x-auto">
										<table class="w-full text-left text-sm text-gray-200">
											<thead>
												<tr class="border-b border-gray-500">
													<th class="px-2 py-1">Вопрос</th>
													<th class="px-2 py-1">Ответ</th>
													<th class="px-2 py-1">Правильно?</th>
													<th class="px-2 py-1">Время (мс)</th>
												</tr>
											</thead>
											<tbody>
												{#each attempt.answers as ans (ans.questionId)}
													<tr class="border-b border-gray-700">
														<td class="px-2 py-1">{ans.questionId}</td>
														<td class="px-2 py-1">{ans.answer ?? '—'}</td>
														<td class="px-2 py-1">
															{ans.isCorrect === null ? '—' : ans.isCorrect ? 'Да' : 'Нет'}
														</td>
														<td class="px-2 py-1">{ans.reactionTimeMs}</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{/if}
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

Key differences from attention's Result:
- Three stat cards: Правильных (score/maxScore), Точность (normalizedScore%), Ответов (count)
- `parseAttempt()` deserializes `answers` from JSON string back to `AnswerRecord[]`
- Expandable answer detail section showing per-question breakdown
- Same accordion/toggle structure as attention

### Step 10: Push schema changes

Run schema sync after all model changes:

```bash
npm run init-db-dev
```

Then verify the table exists:

```bash
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='pictures_attempt';"
```

Should return the CREATE TABLE statement including the `DEFAULT 1` on the `attempt` column and the JSON `answers` text column.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `picturesAttempt` table |
| `src/lib/server/db/controllers/result.ts` | Edit — import `picturesAttempt`, register in both maps |
| `src/lib/exercises/types.ts` | Edit — add `'pictures'` to `ExerciseType`, extend `ExerciseResult`, `ExerciseResults`, `ExerciseResultMap`; add `PicturesResult` import |
| `src/lib/exercises/index.ts` | Edit — add `result` loader to pictures entry |
| `src/lib/exercises/pictures/PicturesGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props, extract `buildResult()` helper |
| `src/lib/exercises/pictures/Playground.svelte` | Edit — forward `gameEnd`/`sendResults` props, remove inline results display |
| `src/lib/exercises/pictures/Result.svelte` | **New** — self-contained result display with accordion + answer details table |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | Edit — add `'pictures'` slug support with answer serialization |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | Edit — add `'pictures'` slug support |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | Edit — add `'pictures'` slug support |

## Files Explicitly Out of Scope

- Any other exercise besides pictures
- Chart.js visualizations / trend graphs over time
- The test routes under `src/routes/(app)/tests/`
- Refactoring `EXERCISES_WITH_RESULTS` into a shared constant (can do later if more exercises are added)
- Pagination or filtering of results (not needed for MVP)

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. `npm run build` — succeeds
4. Schema push: `npm run init-db-dev` then verify table exists:
   ```
   npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='pictures_attempt';"
   ```
   Should return the CREATE TABLE statement.
5. Manual E2E flow:
   - Navigate to `/exercises/pictures/about`
   - Start the exercise, answer all questions
   - Verify: browser DevTools shows POST `/exercises/pictures/playground` returns 201
   - Verify: page navigates to `/exercises/pictures/results`
   - Verify: "Результаты" button appears in bottom bar after game end
   - Verify: results page shows accordion entry with date, expands to show Правильных/Точность/Ответов cards
   - Click "Показать ответы", verify per-question table appears with correct data
   - Click "Пройти снова", complete another round
   - Go back to results → two accordion entries visible
6. Regression check:
   - Open `/exercises/word-morphing/playground`, confirm it loads without error (no sendResults prop passed)
   - Bottom buttons still show 3-col layout during play and after game end
   - Attention exercise still works end-to-end (its routes were modified)

## Maintenance Notes

- Adding DB persistence for another exercise follows the exact same pattern: add table to `models/exercises.ts` → register in controller maps → add `'slug'` to `EXERCISES_WITH_RESULTS` checks in route handlers → add `result` loader to `exerciseLoaders` → create self-contained `Result.svelte` → update Playground/Game to use callback props.
- The `ExerciseType` union and result controller lookup maps must stay in sync with DB tables — if you add an exercise table, update all three places plus the route handler slug lists. The controller uses `AnySessionType = TestType | ExerciseType`.
- The `answers` JSON column approach means we lose SQL-level queryability on individual answers. If future features require querying/filtering by specific answers (e.g., "show all attempts where question 3 was wrong"), migrate to a separate `pictures_answer` table with proper foreign keys.
- The `EXERCISES_WITH_RESULTS` check in route handlers should eventually be derived from the `exerciseLoaders` registry (check if `result` key exists) rather than maintained as a separate hardcoded list. This avoids the two getting out of sync.

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead.
- If `JSON.parse(raw.answers)` fails in Result.svelte (corrupt data), wrap in try/catch and show a fallback message like "Ошибка загрузки ответов".
- If the user doesn't have a `user_id` cookie, `postResult` will receive `undefined` as `userId` → violates NOT NULL constraint. Same pre-existing issue as all other exercises. If blocking, add guard in POST handler: `if (!userId) return json({ error: 'unauthorized' }, { status: 401 });`
- If an exercise Playground component doesn't accept `sendResults`/`gameEnd` props yet, Svelte passes extra props silently — no runtime errors. Must update component to use them when adding DB support.
