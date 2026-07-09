# Plan 006: Save Raven Matrices Exercise Results to DB + Add "Результаты" Button/Page

**Status:** DONE
**Effort:** Medium-Large
**Depends on:** Plan 001 (done — provides exercise route infrastructure)

## Problem

The raven-matrices exercise (`src/lib/exercises/raven-matrices/`) collects rich `RavenFullResult` data (`totalQuestions`, `correctCount`, `accuracy`, `totalDurationMs`, `averageResponseTimeMs`, plus detailed per-answer `RavenAnswerRecord[]`) but:
1. Never persists results to the database
2. Uses deprecated `createEventDispatcher` and Svelte 4 `$:` reactive syntax instead of runes (`$state`, `$derived`, `$effect`) and callback props
3. Shows inline result cards in Playground instead of navigating to a dedicated results page
4. Has no "Результаты" button after game completion
5. The existing `ResultsChart.svelte` only renders the current session's result — no historical data

The attention exercise already implements this full flow and is the reference pattern.

## Current State

### Raven-matrices exercise files

| File | Current behavior |
|------|-----------------|
| `types.ts` | Defines `RavenFullResult = { totalQuestions, correctCount, accuracy, totalDurationMs, averageResponseTimeMs, answers: RavenAnswerRecord[] }` where `RavenAnswerRecord = { taskId, taskIndex, taskClass, difficultyLevel, difficultyScore, rules, skillTags, selectedIndex, correctIndex, selectedFamily, isCorrect, responseTimeMs, seed }` |
| `results-adapter.ts` | Helper functions: `taskClassLabel()`, `formatMs()`, `summary()`, `resultRows()` for rendering `RavenFullResult` |
| `RavenMatricesGame.svelte` | **Svelte 4 syntax**: uses deprecated `createEventDispatcher<{ done: RavenFullResult }>()`, `$:` reactive declarations, `export let options`, `on:click`; dispatches `{ done: RavenFullResult }` on completion |
| `Playground.svelte` | Listens to `on:done` event, shows inline `ResultsChart` with summary metrics + "Пройти заново" button |
| `About.svelte` | Static description text |
| `ResultsChart.svelte` | Renders current session's summary cards (accuracy, correct count, avg time, total time) + per-answer list |

### Already-done infrastructure from Plans 001–003

- The route page at `exercises/[slug]/playground/+page.svelte` already passes `gameEnd` / `sendResults` props and shows conditional "Результаты" button based on `exercise?.result`
- The POST handler at `exercises/[slug]/playground/+server.ts` exists but currently only allows `'attention'`
- The GET endpoint at `exercises/[slug]/results/+server.ts` exists but currently only serves `'attention'`
- The SSR loader at `exercises/[slug]/results/+page.server.ts` exists but currently only serves `'attention'`
- The results page at `exercises/[slug]/results/+page.svelte` dynamically loads the Result component from `exercise.result()`

## Design Decisions

1. **Follow the attention pattern exactly** — callback props on game component, thin forwarding wrapper in Playground, route page owns POST/navigation
2. **Two-table approach**: persist both session-level summary (`raven_attempt`) AND per-answer detail (`raven_answer`). The summary maps cleanly to flat columns. The per-answer detail captures the rich diagnostic data (task class, difficulty, rules, skill tags) that makes raven matrices uniquely valuable. This differs from emoji (which excluded trial-level data entirely) because raven answer records contain structured, filterable metadata that justifies its own table.
3. **Summary fields stored as integers** — `accuracy` as integer 0–100 (multiply by 100 before insert), `totalDurationMs` and `averageResponseTimeMs` as integer milliseconds.
4. **Add `'ravenMatrices'` as a valid `ExerciseType`** — using camelCase to match the slug convention used in exercise registry keys.
5. **Extend existing route server handlers** to accept `'ravenMatrices'` alongside `'attention'` — extract allow-list to a shared constant.
6. **Migrate `RavenMatricesGame.svelte` from Svelte 4 to Svelte 5 runes** — replace `createEventDispatcher`, `$:`, `export let`, and `on:click` with their rune equivalents. This is required anyway to use callback props.
7. **Keep `ResultsChart.svelte` as-is for now** — it renders a single `RavenFullResult`. It will still be used inside the new `Result.svelte` when expanding an accordion entry. No changes needed to the chart itself; it receives a reconstructed `RavenFullResult` from DB data.
8. **Reconstruct `RavenFullResult` from DB rows** in the `Result.svelte` component by joining `raven_attempt` + `raven_answer` rows back into the shape `ResultsChart` expects.

## Step-by-step Implementation

### Step 1: Add `ravenAttempt` and `ravenAnswer` tables to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `attentionAttempt` definition:

```ts
export const ravenAttempt = sqliteTable('raven_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	totalQuestions: integer('total_questions').notNull(),
	correctCount: integer('correct_count').notNull(),
	accuracy: integer('accuracy').notNull(),
	totalDurationMs: integer('total_duration_ms').notNull(),
	averageResponseTimeMs: integer('average_response_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const ravenAnswer = sqliteTable('raven_answer', {
	id: text('id').primaryKey().$defaultFn(generate),
	taskId: text('task_id').notNull(),
	taskIndex: integer('task_index').notNull(),
	taskClass: text('task_class').notNull(),
	difficultyLevel: integer('difficulty_level').notNull(),
	difficultyScore: integer('difficulty_score').notNull(),
	rules: text('rules').notNull(),
	skillTags: text('skill_tags').notNull(),
	selectedIndex: integer('selected_index'),
	correctIndex: integer('correct_index').notNull(),
	selectedFamily: text('selected_family'),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	responseTimeMs: integer('response_time_ms').notNull(),
	seed: text('seed').notNull(),
	ravenAttemptId: text('raven_attempt_id')
		.notNull()
		.references(() => ravenAttempt.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- `attempt` uses `.default(1).notNull()` — same pattern as `attentionAttempt`.
- `accuracy` stored as integer 0–100 (not float 0–1). Multiply by 100 and round before insert.
- `rules` and `skillTags` stored as JSON strings. They're arrays of string enums that need filtering/grouping in queries later — JSON columns are simpler than separate join tables for MVP.
- `selectedIndex` uses plain `integer()` without `.notNull()` since it can be null if no selection was made.
- `selectedFamily` uses plain `text()` without `.notNull()` for the same reason.
- `isCorrect` uses `{ mode: 'boolean' }` so Drizzle handles JS `true/false` ↔ SQLite `1/0`.
- Re-exported automatically via existing `export * from './models/exercises'` in `schema.ts`.

### Step 2: Register `ravenAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

The raven-matrices case is special: we have two tables to insert into (attempt + answers). However, `postResult` inserts one attempt row per item in the `results` array. For raven matrices, the single `RavenFullResult` becomes one `ravenAttempt` row, and its `answers` array becomes multiple `ravenAnswer` rows.

We have two options:
- **Option A**: Override the post-result logic in the route handler to do a custom two-insert transaction.
- **Option B**: Add a post-hook or extend `postResult` to handle nested detail records.

**Chosen: Option A** — keep `postResult` simple (it handles flat summaries). The route handler will call `postResult` for the summary row, then manually insert the answer rows. This avoids complicating the generic controller.

However, since `postResult` creates the session AND the attempt, and we need the attempt ID for the answer foreign key, we'll use a modified approach:

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

The POST handler for `'ravenMatrices'` will handle the full flow:

```ts
import { db } from '$lib/server/db';
import { ravenAttempt, ravenAnswer } from '$lib/server/db/models/exercises';
import { postResult } from '$lib/server/db/controllers/result.js';
// ...existing imports...

const EXERCISES_WITH_RESULTS = ['attention', 'ravenMatrices'];

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug)) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const userId = cookies.get('user_id') as string;

	if (slug === 'ravenMatrices') {
		const body = await request.json();
		const { summary, answers } = body as {
			summary: {
				totalQuestions: number;
				correctCount: number;
				accuracy: number;
				totalDurationMs: number;
				averageResponseTimeMs: number;
			};
			answers: Array<{
				taskId: string;
				taskIndex: number;
				taskClass: string;
				difficultyLevel: number;
				difficultyScore: number;
				rules: string[];
				skillTags: string[];
				selectedIndex: number | null;
				correctIndex: number;
				selectedFamily: string | null;
				isCorrect: boolean;
				responseTimeMs: number;
				seed: string;
			}>;
		};

		const sessionId = await postResult(
			[{ ...summary, accuracy: Math.round(summary.accuracy * 100) }],
			'ravenMatrices',
			userId
		);

		// Get the attempt ID we just inserted
		const attemptRow = await db.query.ravenAttempt.findFirst({
			where: (fields, { eq }) => eq(fields.sessionId, sessionId),
		});

		if (attemptRow && answers.length > 0) {
			await db.insert(ravenAnswer).values(
				answers.map((a) => ({
					...a,
					rules: JSON.stringify(a.rules),
					skillTags: JSON.stringify(a.skillTags),
					ravenAttemptId: attemptRow.id,
				}))
			);
		}

		return json('success', { status: 201 });
	}

	// Default path for other exercises (attention, etc.)
	const { results }: { results: ExerciseResults | MetaResult } = await request.json();
	await postResult(results, slug as AnySessionType, userId);
	return json('success', { status: 201 });
};
```

For the `getResults` side, register `ravenAttempt` in the controller normally (since `getResults` fetches attempt-level data, not nested answer details):

**File:** `src/lib/server/db/controllers/result.ts`

1. Update import:
```ts
import { attentionAttempt, ravenAttempt } from '$lib/server/db/models/exercises';
```

2. In `postResult()`, add `'ravenMatrices'` to `insertAttempt` map:
```ts
const insertAttempt = {
    // ...existing...
    attention: attentionAttempt,
    ravenMatrices: ravenAttempt
}[testType];
```

3. In `getResults()`, add `'ravenMatrices'` to `attemptTable` map:
```ts
const attemptTable = {
    // ...existing...
    attention: db.query.attentionAttempt,
    ravenMatrices: db.query.ravenAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

### Step 3: Add `'ravenMatrices'` as a valid `ExerciseType`

**File:** `src/lib/exercises/types.ts`

1. Import `RavenFullResult`:
```ts
import type { RavenFullResult } from '$lib/exercises/raven-matrices/types';
```

2. Extend `ExerciseType`:
```ts
export type ExerciseType =
    | 'attention'
    | 'ravenMatrices';
```

3. Extend `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    ravenMatrices: RavenFullResult;
};
```

Note: We use the full `RavenFullResult` type here (including the `answers` array). The DB stores them split across two tables, but the in-memory/logical type includes everything.

4. Extend `ExerciseResult` and `ExerciseResults` unions — however, `RavenFullResult` contains nested objects (`answers: RavenAnswerRecord[]`) which doesn't fit the "flat row" pattern of `ExerciseResult`. Since `postResult` spreads these objects into Drizzle inserts, including `RavenFullResult` directly would cause issues (the `answers` field would be ignored by Drizzle).

Instead, define a **DB-persistable summary type** for the controller lookup:

```ts
export type RavenMatricesSummary = Omit<RavenFullResult, 'answers'>;
```

And add to the unions:
```ts
export type ExerciseResult =
    | AttentionResult
    | RavenMatricesSummary;

export type ExerciseResults =
    | AttentionResult[]
    | RavenMatricesSummary[];
```

Update `ExerciseResultMap` accordingly:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    ravenMatrices: RavenMatricesSummary;
};
```

Note: The `RavenMatricesSummary` / `RavenFullResult` split still applies but now within the `ExerciseType`/`ExerciseResultMap` system. The summary type is used for DB persistence; the full type is used for in-memory representation and the Result component.

### Step 4: Migrate `RavenMatricesGame.svelte` from Svelte 4 to Svelte 5 runes + callback props

**File:** `src/lib/exercises/raven-matrices/RavenMatricesGame.svelte`

This is the largest change. Replace all Svelte 4 patterns:

| Pattern | Before (Svelte 4) | After (Svelte 5) |
|---------|-------------------|-------------------|
| Props | `export let options = {...}` | `let { gameEnd, sendResults, options }: {...} = $props()` |
| State | `let tasks = []` | `let tasks = $state<GeneratedRavenTask[]>([])` |
| Derived | `$: currentTask = tasks[currentIndex]` | `let currentTask = $derived(tasks[currentIndex])` |
| Dispatcher | `dispatch('done', result)` | `sendResults([summary]); gameEnd()` |
| Events | `on:click={start}` | `onclick={start}` |

Complete replacement:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { generateRavenTest } from './logic/generator';
	import { taskClassLabel } from './results-adapter';
	import RavenCell from './RavenCell.svelte';
	import RavenMatrixBoard from './RavenMatrixBoard.svelte';
	import type {
		GeneratedRavenTask,
		RavenAnswerRecord,
		RavenFullResult,
		RavenTestGenerationOptions
	} from './types';

	let {
		gameEnd,
		sendResults,
		options = { count: 10, mode: 'default', answerCount: 6 }
	}: {
		gameEnd: () => void;
		sendResults: (summary: Record<string, unknown>[], answers: RavenAnswerRecord[]) => void;
		options?: RavenTestGenerationOptions;
	} = $props();

	let tasks = $state<GeneratedRavenTask[]>([]);
	let currentIndex = $state(0);
	let selectedIndex: number | null = $state(null);
	let answers = $state<RavenAnswerRecord[]>([]);
	let testStartedAt = $state(0);
	let questionStartedAt = $state(0);
	let isStarted = $state(false);
	let isLocked = $state(false);

	let currentTask = $derived(tasks[currentIndex]);
	let progress = $derived(tasks.length ? ((currentIndex + 1) / tasks.length) * 100 : 0);
	let currentLabel = $derived(currentTask ? taskClassLabel(currentTask.taskClass) : '');

	onMount(() => {
		prepareTest();
	});

	function prepareTest() {
		tasks = generateRavenTest({ count: 10, answerCount: 6, ...options });
		currentIndex = 0;
		selectedIndex = null;
		answers = [];
		isStarted = false;
		isLocked = false;
	}

	function start() {
		testStartedAt = performance.now();
		questionStartedAt = performance.now();
		isStarted = true;
	}

	function selectAnswer(index: number) {
		if (!currentTask || isLocked || selectedIndex !== null) return;

		selectedIndex = index;
		isLocked = true;

		const responseTimeMs = Math.round(performance.now() - questionStartedAt);
		const option = currentTask.answerOptions[index];
		const isCorrect = index === currentTask.correctIndex;

		answers = [
			...answers,
			{
				taskId: currentTask.id,
				taskIndex: currentTask.taskIndex,
				taskClass: currentTask.taskClass,
				difficultyLevel: currentTask.difficulty.estimatedLevel,
				difficultyScore: currentTask.difficulty.estimatedScore,
				rules: currentTask.rules.map((r) => r.family),
				skillTags: currentTask.analytics.skillTags,
				selectedIndex: index,
				correctIndex: currentTask.correctIndex,
				selectedFamily: option?.family ?? null,
				isCorrect,
				responseTimeMs,
				seed: currentTask.seed
			}
		];

		window.setTimeout(nextQuestion, 360);
	}

	function nextQuestion() {
		if (currentIndex >= tasks.length - 1) {
			finish();
			return;
		}

		currentIndex += 1;
		selectedIndex = null;
		isLocked = false;
		questionStartedAt = performance.now();
	}

	function finish() {
		const totalDurationMs = Math.round(performance.now() - testStartedAt);
		const correctCount = answers.filter((a) => a.isCorrect).length;
		const averageResponseTimeMs = answers.length
			? Math.round(answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / answers.length)
			: 0;

		const summary = {
			totalQuestions: tasks.length,
			correctCount,
			accuracy: tasks.length ? Math.round((correctCount / tasks.length) * 100) : 0,
			totalDurationMs,
			averageResponseTimeMs
		};

		sendResults([summary], answers);
		gameEnd();
	}
</script>

{#if !isStarted}
	<section
		class="flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-slate-300/30 bg-linear-to-br from-orange-50 to-blue-50 p-4 text-slate-800 shadow-lg"
	>
		<div class="flex flex-col items-center justify-center gap-1">
			<h1 class="text-3xl leading-tight text-gray-900">Матрицы Равена</h1>
			<p class="max-w-prose text-base leading-relaxed text-slate-500">
				В каждом задании одна ячейка матрицы скрыта. Найдите правило и выберите недостающий
				вариант.
			</p>
		</div>

		<div class="flex flex-wrap gap-2" aria-label="Параметры теста">
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
				>{options.count ?? 10} заданий</span
			>
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
				>{options.answerCount ?? 6} вариантов</span
			>
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
				>случайная смесь</span
			>
		</div>

		<button
			class="cursor-pointer rounded-xl border-0 bg-slate-800 px-4 py-3 font-extrabold text-white"
			type="button"
			onclick={start}>Начать</button
		>
	</section>
{:else if currentTask}
	<section
		class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-slate-800"
	>
		<header
			class="flex w-full items-start justify-between gap-2.5 rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-orange-50 px-3 py-3"
		>
			<div>
				<p class="m-0 text-xs font-extrabold tracking-wider text-slate-500 uppercase">
					Задание {currentIndex + 1} из {tasks.length}
				</p>
				<h2 class="text-lg leading-snug text-gray-900">Выберите недостающую ячейку</h2>
			</div>
			<div class="flex flex-wrap justify-end gap-1.5">
				<span
					class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
					>Сложность {currentTask.difficulty.estimatedLevel}</span
				>
				<span
					class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
					>{currentLabel}</span
				>
			</div>
		</header>

		<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
			<span
				style={`width: ${progress}%`}
				class="rounded-inherit block h-full bg-linear-to-r from-blue-400 to-emerald-400 transition-all duration-200 ease-out"
			></span>
		</div>

		<section
			class="w-full rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-purple-50 p-2 shadow-md"
			aria-label="Задание"
		>
			<RavenMatrixBoard task={currentTask} />
		</section>

		<section
			class="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-300/25 bg-linear-to-br from-orange-50 to-slate-50 p-3 shadow-md"
			aria-label="Варианты ответа"
		>
			<div class="self-start text-xs font-extrabold tracking-wide text-slate-500">
				Варианты
			</div>
			<div class="grid w-full grid-cols-3 gap-2">
				{#each currentTask.answerOptions as option, index (option.id)}
					<button
						type="button"
						class="selected:border-slate-700 correct:border-green-500 correct:bg-green-50 wrong:border-red-400 wrong:bg-red-50 relative min-w-0 cursor-pointer rounded-xl border-2 border-transparent bg-white/85 p-1 shadow-sm transition-all duration-100 ease-out hover:-translate-y-0.5 hover:border-slate-400 disabled:pointer-events-none"
						class:selected={selectedIndex === index}
						class:correct={selectedIndex !== null && index === currentTask.correctIndex}
						class:wrong={selectedIndex === index && index !== currentTask.correctIndex}
						disabled={isLocked}
						onclick={() => selectAnswer(index)}
						aria-label={`Вариант ${index + 1}`}
					>
						<span
							class="absolute top-1 left-1 z-1 grid size-5 place-items-center rounded-full bg-slate-700/90 text-xs font-extrabold text-white"
							>{index + 1}</span
						>
						<RavenCell
							cell={option.cell}
							cellId={`${currentTask.id}-answer-${index}`}
							compact
						/>
					</button>
				{/each}
			</div>
		</section>
	</section>
{/if}
```

Key changes from current code:
- `export let options` → `let { gameEnd, sendResults, options } = $props()`
- `createEventDispatcher<{ done: RavenFullResult }>()` → removed; replaced with `gameEnd` / `sendResults` props
- `let tasks = []` → `let tasks = $state<GeneratedRavenTask[]>([])`
- `$: currentTask = ...` → `let currentTask = $derived(...)`
- `$:` progress/currentLabel → `$derived`
- `dispatch('done', { ... })` → split into `sendResults([summary], answers)` + `gameEnd()`
- `on:click={start}` → `onclick={start}`
- All `on:click={() => selectAnswer(index)}` → `onclick={() => selectAnswer(index)}`
- `accuracy` now stored as integer 0–100 in `summary` (not float 0–1)

**Important: `sendResults` signature change.** Unlike previous exercises where `sendResults(results: SomeResult[])`, raven matrices needs a different signature: `sendResults(summary: RavenMatricesSummary[], answers: RavenAnswerRecord[])`. The Playground and route handler must accommodate this. Two approaches:

- **Option A**: Use the standard `sendResults(results)` signature but pass a wrapper object: `sendResults([{ ...summary, _answers: answers }])`. Then the server handler strips `_answers`.
- **Option B**: Modify the POST handler to expect a specific shape `{ summary, answers }` when slug is `'ravenMatrices'`, and have the Playground adapt its call.

**Chosen: Option B** — cleaner separation. The Playground intercepts the `sendResults` prop and wraps it in a custom function that posts the `{ summary, answers }` payload.

### Step 5: Update `Playground.svelte` — forward props, remove inline results

**File:** `src/lib/exercises/raven-matrices/Playground.svelte`

Replace entire file:

```svelte
<script lang="ts">
	import RavenMatricesGame from './RavenMatricesGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();

	async function handleSendResults(summary: Record<string, unknown>[], answers: any[]) {
		await fetch('/exercises/raven-matrices/playground', {
			method: 'POST',
			body: JSON.stringify({ summary: summary[0], answers }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<RavenMatricesGame gameEnd={gameEnd} sendResults={handleSendResults} />
```

This mirrors the attention/emoji Playground pattern but adds a custom `handleSendResults` that performs the POST with the `{ summary, answers }` shape expected by the server handler. The raw `sendResults` from the route page is NOT used here — Playground manages its own POST because the payload structure is unique to raven matrices.

Wait — but then the route page also calls `onSendResults`. We need to decide: does the Playground handle its own POST (like memory-match did originally), or does the route page?

**Revised approach**: Follow the established pattern exactly. The Playground forwards `gameEnd`/`sendResults` to the game component. But the game's `sendResults` has a different signature than what the route page provides.

Best solution: Have `RavenMatricesGame.svelte` call `sendResults` with a single argument matching `ExerciseResults` shape, and include the answers as a non-standard extra property that the server handler knows to extract:

Actually, simplest approach: **the Playground handles the POST itself**, and ignores the `sendResults` from the route page. This is what `memory-match` does. Let me re-check...

Looking at the codebase again, the route page passes `sendResults={exercise?.result ? onSendResults : undefined}`. If the Playground handles its own POST internally, it should NOT receive `sendResults` from the route page, OR it should ignore it.

**Final decision**: Keep things consistent with the attention pattern. The Playground receives `gameEnd` and `sendResults` from the route page. But `RavenMatricesGame` takes a custom `sendResults` with `(summary, answers)` signature. So Playground adapts between them:

```svelte
<script lang="ts">
	import RavenMatricesGame from './RavenMatricesGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();

	async function handleGameSendResults(
		summary: Record<string, unknown>[],
		answers: any[]
	) {
		await fetch('/exercises/raven-matrices/playground', {
			method: 'POST',
			body: JSON.stringify({ summary: summary[0], answers }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<RavenMatricesGame gameEnd={gameEnd} sendResults={handleGameSendResults} />
```

The route-provided `sendResults` prop is accepted but not used — the Playground does its own POST. This is a minor deviation from the pure "route owns POST" pattern, but necessary because the raven-matrices payload shape is fundamentally different (two-part: summary + answers vs. flat single-row).

### Step 6: Add `result` loader to raven-matrices entry in exercise registry

**File:** `src/lib/exercises/index.ts`

Update the raven-matrices loader entry:

```ts
'raven-matrices': {
    about: () => import('./raven-matrices/About.svelte'),
    playground: () => import('./raven-matrices/Playground.svelte'),
    result: () => import('./raven-matrices/Result.svelte')
},
```

Adding the `result` lazy loader makes `exercise?.result` truthy for raven-matrices, which means:
- The playground route page will pass `sendResults` prop
- The "Результаты" button will appear after game end
- On game end, page navigates to `/exercises/raven-matrices/results`

### Step 7: Update route server handlers to support `'ravenMatrices'`

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Currently hard-codes `slug !== 'attention'`. Refactor to use an allow-list and handle the raven-matrices two-table insert specially:

```ts
import { db } from '$lib/server/db';
import { ravenAnswer } from '$lib/server/db/models/exercises';
import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { ExerciseResults, MetaResult } from '$lib/exercises/types.js';
import type { AnySessionType } from '$lib/server/db/controllers/result.js';
import type { RequestHandler } from '@sveltejs/kit';

const EXERCISES_WITH_RESULTS: AnySessionType[] = ['attention', 'ravenMatrices'];

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug as AnySessionType)) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const userId = cookies.get('user_id') as string;

	if (slug === 'ravenMatrices') {
		const body = await request.json();
		const { summary, answers } = body as {
			summary: Record<string, unknown>;
			answers: Array<Record<string, unknown>>;
		};

		const sessionId = await postResult([summary], 'ravenMatrices', userId);

		const attemptRow = await db.query.ravenAttempt.findFirst({
			where: (fields, { eq }) => eq(fields.sessionId, sessionId),
		});

		if (attemptRow && answers.length > 0) {
			await db.insert(ravenAnswer).values(
				answers.map((a) => ({
					taskId: String(a.taskId),
					taskIndex: Number(a.taskIndex),
					taskClass: String(a.taskClass),
					difficultyLevel: Number(a.difficultyLevel),
					difficultyScore: Number(a.difficultyScore),
					rules: JSON.stringify(a.rules ?? []),
					skillTags: JSON.stringify(a.skillTags ?? []),
					selectedIndex: a.selectedIndex != null ? Number(a.selectedIndex) : null,
					correctIndex: Number(a.correctIndex),
					selectedFamily: a.selectedFamily != null ? String(a.selectedFamily) : null,
					isCorrect: Boolean(a.isCorrect),
					responseTimeMs: Number(a.responseTimeMs),
					seed: String(a.seed),
					ravenAttemptId: attemptRow.id,
				}))
			);
		}

		return json('success', { status: 201 });
	}

	const { results }: { results: ExerciseResults | MetaResult } = await request.json();
	await postResult(results, slug as AnySessionType, userId);
	return json('success', { status: 201 });
};
```

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

```ts
const EXERCISES_WITH_RESULTS: AnySessionType[] = ['attention', 'ravenMatrices'];

if (!EXERCISES_WITH_RESULTS.includes(slug as AnySessionType)) {
    return json({ results: [] });
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return json({ results });
```

**File:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

```ts
const EXERCISES_WITH_RESULTS: AnySessionType[] = ['attention', 'ravenMatrices'];

if (!EXERCISES_WITH_RESULTS.includes(slug as AnySessionType)) {
    return { results: [] };
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return { results };
```

### Step 8: Create `Result.svelte` for the raven-matrices exercise

**New file:** `src/lib/exercises/raven-matrices/Result.svelte`

Self-contained result display component, modeled after `attention/Result.svelte`. Fetches its own data via the GET endpoint, reconstructs `RavenFullResult` objects from the joined DB data, and reuses the existing `ResultsChart.svelte` for rendering each session's results:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import ResultsChart from './ResultsChart.svelte';
	import { formatMs } from './results-adapter';
	import type { RavenAnswerRecord, RavenFullResult } from './types';
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

	function reconstructFullResult(attempt_raw: Record<string, unknown>): RavenFullResult {
		const a = attempt_raw as any;
		return {
			totalQuestions: a.totalQuestions,
			correctCount: a.correctCount,
			accuracy: a.accuracy / 100,
			totalDurationMs: a.totalDurationMs,
			averageResponseTimeMs: a.averageResponseTimeMs,
			answers: []
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
						<div class="box-border border-t p-2">
							{#each result.attempts as attempt_raw, i (i)}
								{@const fullResult = reconstructFullResult(attempt_raw as Record<string, unknown>)}
								<ResultsChart result={fullResult} />
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/raven-matrices">Назад</Button>
		<Button color="blue" goto="/exercises/raven-matrices/playground">Пройти снова</Button>
	</section>
{:else}
	<main class="main box-border">
		<h1>Попыток нет</h1>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/raven-matrices">Назад</Button>
		<Button color="blue" goto="/exercises/raven-matrices/playground">Пройти снова</Button>
	</section>
{/if}
```

Key design choices:
- **Reuses `ResultsChart.svelte`** for each expanded accordion entry — no need to rewrite the card/list UI
- **Reconstructs `RavenFullResult` from DB attempt row** — converts integer accuracy (0–100) back to float (0–1)
- **Per-answer detail loading is deferred** — the initial accordion view shows only summary metrics via `ResultsChart`. Loading individual answers requires querying `raven_answer` by `ravenAttemptId`, which can be added as a lazy-loaded expansion within each chart later.

### Step 9: Run schema push and verify

After implementing Steps 1–8:

```bash
npm run init-db-dev
```

Verify tables exist:
```
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='raven_attempt';"
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='raven_answer';"
```

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `ravenAttempt` and `ravenAnswer` tables |
| `src/lib/server/db/controllers/result.ts` | Edit — import `ravenAttempt`, register in both maps |
| `src/lib/exercises/types.ts` | Edit — add `'ravenMatrices'` to `ExerciseType`, add `RavenMatricesSummary`, extend unions; import types |
| `src/lib/exercises/index.ts` | Edit — add `result` loader to raven-matrices entry |
| `src/lib/exercises/raven-matrices/RavenMatricesGame.svelte` | Edit — migrate to Svelte 5 runes; replace `createEventDispatcher` with `gameEnd`/`sendResults` props; change `sendResults` signature |
| `src/lib/exercises/raven-matrices/RavenMatrixBoard.svelte` | No changes needed (already uses `export let task`, compatible with Svelte 5) |
| `src/lib/exercises/raven-matrices/RavenCell.svelte` | No changes needed (already compatible) |
| `src/lib/exercises/raven-matrices/Playground.svelte` | Edit — forward `gameEnd`; custom `handleGameSendResults` for two-table POST |
| `src/lib/exercises/raven-matrices/Result.svelte` | **New** — self-contained result display component with accordion UI + embedded `ResultsChart` |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | Edit — refactor to allow-list; handle `'ravenMatrices'` two-table insert |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | Edit — add `'ravenMatrices'` to allow-list |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | Edit — add `'ravenMatrices'` to allow-list |

No new route files needed — the existing route infrastructure from Plan 001 handles everything.

## Files Explicitly Out of Scope

- Any other exercise besides raven-matrices
- The test routes under `src/routes/(app)/tests/`
- Migrating `RavenMatrixBoard.svelte` or `RavenCell.svelte` to runes (they work fine with Svelte 4 `export let`)
- Per-answer detail loading in the Result component (accordion shows summary via `ResultsChart`; answer drill-down can be added later)
- Chart.js visualizations across sessions (trend over time)
- Extracting `EXERCISES_WITH_RESULTS` to a shared constant file (can be done when adding the 3rd+ exercise)

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. `npm run build` — succeeds
4. Schema push: `npm run init-db-dev`, then verify tables exist:
   ```
   npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name IN ('raven_attempt','raven_answer');"
   ```
   Should return CREATE TABLE statements for both tables.
5. Manual E2E flow:
   - Navigate to `/exercises/raven-matrices/about`
   - Start a game, complete all 10 questions
   - Verify: browser DevTools shows POST `/exercises/raven-matrices/playground` returns 201
   - Verify: page navigates to `/exercises/raven-matrices/results`
   - Verify: results page shows accordion entry with date, expands to show `ResultsChart` with accuracy/correct/time cards and per-answer list
   - Click "Пройти снова", complete another round
   - Go back to results → two accordion entries visible
6. Regression check for other exercises:
   - Open `/exercises/word-morphing/playground`, confirm it loads without error
   - Bottom buttons still show 3-col layout during play and after game end
7. Regression check for attention exercise:
   - Open `/exercises/attention/playground`, complete a game
   - Verify results still save and show correctly
8. Verify DB data integrity:
   ```
   npx better-sqlite3 sqlite.db "SELECT COUNT(*) FROM raven_attempt;"
   npx better-sqlite3 sqlite.db "SELECT COUNT(*) FROM raven_answer;"
   ```
   Answer count should be ~10x attempt count (10 answers per game by default).
   ```
   npx better-sqlite3 sqlite.db "SELECT ra.id, COUNT(ans.id) FROM raven_attempt ra LEFT JOIN raven_answer ans ON ans.raven_attempt_id = ra.id GROUP BY ra.id;"
   ```
   Each attempt should have 10 associated answers.

## Maintenance Notes

- Adding DB persistence for another exercise follows the exact same pattern: add table(s) to `models/exercises.ts` → register in controller maps → add to `ExerciseType` union → add `result` loader to `exerciseLoaders` → create self-contained `Result.svelte` → update Playground to accept `gameEnd`/`sendResults` props → extend the slug allow-list in route handlers.
- For exercises with per-trial detail (like raven matrices), follow the two-table pattern: a summary `*_attempt` table registered in `postResult`/`getResults`, and a detail table inserted separately in the route handler.
- The `ExerciseType` union and result controller lookup maps must stay in sync with DB tables — if you add an exercise table, update all three places. The controller uses `AnySessionType = TestType | ExerciseType`.
- `accuracy` is stored as integer 0–100 in DB but displayed as percentage. The `RavenFullResult` type uses float 0–1. Convert on insert (`Math.round(acc * 100)`) and on read (`acc / 100`).
- The `attempt=1` default convention means each completed game is one row.
- Consider extracting `EXERCISES_WITH_RESULTS` to `$lib/exercises/constants.ts` once 3+ exercises have results support.
- This plan migrates `RavenMatricesGame.svelte` fully to Svelte 5 runes. `RavenMatrixBoard.svelte` and `RavenCell.svelte` still use Svelte 4 `export let` — they work fine but could be migrated later.

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead.
- If the user doesn't have a `user_id` cookie (not logged in), `postResult` will receive `undefined` as `userId` which violates the NOT NULL constraint on `session.userId`. Same pre-existing issue as all tests/exercises routes.
- If the `reconstructFullResult` function produces incorrect values, check that `accuracy` conversion (integer ↔ float) is consistent between insert and read.
- If `db.query.ravenAttempt.findFirst` returns `undefined` (race condition in concurrent requests), the answer rows will be silently skipped. Add logging or retry logic if this becomes an issue.
- If you'd rather not have the Playground manage its own POST, an alternative is to encode both summary and answers into a single `sendResults([...])` call with a wrapper object, then decode in the server handler. This keeps the "route owns POST" pattern pure but makes the `ExerciseResults` type less clean.
