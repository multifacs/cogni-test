# Plan 018: Migrate pictures exercise from per-session to per-trial DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7a66a00..HEAD -- src/lib/exercises/pictures/ src/lib/server/db/models/exercises.ts src/lib/server/db/controllers/result.ts src/lib/exercises/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `7a66a00`, 2026-06-24

## Why this matters

The pictures exercise stores one aggregate row per session (score, maxScore, normalizedScore). The game already collects per-question data in `answers: Record<number, string>` and `answerTimings: Record<number, number>`, maps them to `AnswerRecord[]` with `questionId`, `answer`, `isCorrect`, `reactionTimeMs` — and even sends this array in `PicturesResult.answers`. But the DB schema has no columns for it, so Drizzle silently drops the data. Migrating to per-trial rows preserves the granular per-question detail, enabling per-question timing analysis and individual answer review in the results page. This is the easiest migration because the per-question data is already being sent — it just needs DB columns to land in.

## Current state

- `src/lib/exercises/pictures/types.ts` — defines `AnswerRecord` (per-question) and `PicturesResult` (aggregate + answers array)
- `src/lib/exercises/pictures/PicturesGame.svelte` — game component; collects per-question answers and timings, sends `PicturesResult` with `answers` array that gets silently dropped by DB
- `src/lib/exercises/pictures/Playground.svelte` — thin wrapper passing `gameEnd` and `sendResults` props
- `src/lib/exercises/pictures/Result.svelte` — iterates aggregate rows, shows 3 stat cards per row
- `src/lib/server/db/models/exercises.ts` — `picturesAttempt` table with aggregate columns only
- `src/lib/server/db/controllers/result.ts` — maps `pictures` type to table/query/orderBy
- `src/lib/exercises/types.ts` — `PicturesResult` used in `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

### Current types (`src/lib/exercises/pictures/types.ts`):
```ts
export type AnswerRecord = {
	questionId: string;
	answer: string | undefined;
	isCorrect: boolean | null;
	reactionTimeMs: number;
};

export type PicturesResult = {
	score: number;
	maxScore: number;
	normalizedScore: number;
	answers: AnswerRecord[];
};
```

### Current DB table (`src/lib/server/db/models/exercises.ts:110-122`):
```ts
export const picturesAttempt = sqliteTable('pictures_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	score: integer('score').notNull(),
	maxScore: integer('max_score').notNull(),
	normalizedScore: integer('normalized_score').notNull(),
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Current `answerQuestion()` in PicturesGame.svelte (`PicturesGame.svelte:168-197`):
The function collects per-question timing (`reactionTimeMs = Date.now() - questionShownAt`) and sends the full `answers` array inside `PicturesResult`. The `answers` field is silently dropped by the DB insert because there are no matching columns.

### Conventions from `src/lib/exercises/CONVENTIONS.md`:
- Per-trial pattern: one row = one user action/answer
- `orderByMap` uses the trial index column
- `results-adapter.ts` provides `summary()` to derive aggregates
- `Result.svelte` shows summary header + `<ResultsChart>` chart
- Repo style: tabs (width 4), single quotes, no trailing commas, print width 100, Svelte 5 runes, no comments

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Dev DB    | `npm run init-db-dev`            | exit 0              |
| Typecheck | `npm run check`                  | exit 0, no errors   |
| Lint      | `npm run lint`                   | exit 0              |
| Dev       | `npm run dev`                    | server starts        |

## Scope

**In scope** (the only files you should modify):
- `src/lib/exercises/pictures/types.ts`
- `src/lib/exercises/pictures/PicturesGame.svelte`
- `src/lib/exercises/pictures/Result.svelte`
- `src/lib/exercises/pictures/results-adapter.ts` (create)
- `src/lib/exercises/pictures/ResultsChart.svelte` (create)
- `src/lib/server/db/models/exercises.ts`
- `src/lib/server/db/controllers/result.ts`
- `src/lib/exercises/types.ts`

**Out of scope** (do NOT touch):
- `src/lib/exercises/pictures/About.svelte`
- `src/lib/exercises/pictures/Playground.svelte` — already passes `sendResults` through
- Any other exercise's files

## Steps

### Step 1: Define new per-trial type

Replace types in `src/lib/exercises/pictures/types.ts` with `PicturesTrialRow`:

```ts
export type PicturesTrialRow = {
	questionIndex: number;
	questionId: string;
	questionKind: string;
	scored: boolean;
	answer: string | null;
	isCorrect: boolean | null;
	reactionTimeMs: number;
};
```

Note: `questionKind` stores the question kind (`'binary'`, `'choice'`, `'observe'`) so the results display can distinguish observation steps from scored questions. `answer` is nullable for observation steps (which use `'seen'` internally but that's not a real answer). `isCorrect` is nullable for unscored questions.

**Verify**: File saved.

### Step 2: Replace DB table schema

In `src/lib/server/db/models/exercises.ts`, replace the `picturesAttempt` table definition with:

```ts
export const picturesAttempt = sqliteTable('pictures_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	questionIndex: integer('question_index').notNull(),
	questionId: text('question_id').notNull(),
	questionKind: text('question_kind').notNull(),
	scored: integer('scored', { mode: 'boolean' }).notNull(),
	answer: text('answer'),
	isCorrect: integer('is_correct'),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Note: `answer` is nullable (observation steps), `isCorrect` is nullable (unscored questions).

**Verify**: File saved.

### Step 3: Update controller mappings

In `src/lib/server/db/controllers/result.ts`:

Change the `orderByMap` entry from:
```ts
pictures: (f) => asc(f.attempt),
```
to:
```ts
pictures: (f) => asc(f.questionIndex),
```

**Verify**: File saved.

### Step 4: Update central types

In `src/lib/exercises/types.ts`:

Change the import from:
```ts
import type { PicturesResult } from './pictures/types';
```
to:
```ts
import type { PicturesTrialRow } from './pictures/types';
```

Update `ExerciseResultMap`:
```ts
pictures: PicturesTrialRow;
```

Update `ExerciseResult` union — replace `PicturesResult` with `PicturesTrialRow`.

Update `ExerciseResults` union — replace `PicturesResult[]` with `PicturesTrialRow[]`.

**Verify**: `npm run check` — may still fail on game component.

### Step 5: Update PicturesGame.svelte to send per-trial rows

In `src/lib/exercises/pictures/PicturesGame.svelte`:

1. Change the import from `PicturesResult` to `PicturesTrialRow` (update the type import).

2. Update the `sendResults` prop type from `PicturesResult[]` to `PicturesTrialRow[]`.

3. Replace the `answerQuestion()` function's else branch (where it sends results on the last question) to send per-trial rows instead of aggregate:

```ts
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
		const trialRows: PicturesTrialRow[] = questions.map((q, i) => {
			const selectedValue = answers[q.id];
			const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
			return {
				questionIndex: i + 1,
				questionId: String(q.id),
				questionKind: q.kind,
				scored: q.scored,
				answer: selectedValue ?? null,
				isCorrect: q.scored ? Boolean(option?.correct) : null,
				reactionTimeMs: answerTimings[q.id] ?? 0
			};
		});
		sendResults(trialRows);
		gameEnd();
	}
};
```

4. Similarly update `advanceObservation()` to include the observation step in the trial rows (or just update the final send — but since `advanceObservation` only fires mid-game, it doesn't send results, it only sends when on the last question). Check: if `advanceObservation` is called on the last question (unlikely but possible), it also needs the same per-trial send pattern. Update it similarly:

```ts
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
		const trialRows: PicturesTrialRow[] = questions.map((q, i) => {
			const selectedValue = answers[q.id];
			const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
			return {
				questionIndex: i + 1,
				questionId: String(q.id),
				questionKind: q.kind,
				scored: q.scored,
				answer: selectedValue ?? null,
				isCorrect: q.scored ? Boolean(option?.correct) : null,
				reactionTimeMs: answerTimings[q.id] ?? 0
			};
		});
		sendResults(trialRows);
		gameEnd();
	}
};
```

**Verify**: `npm run check` → exit 0

### Step 6: Create results-adapter.ts

Create `src/lib/exercises/pictures/results-adapter.ts`:

```ts
import type { PicturesTrialRow } from './types';

export type { PicturesTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: PicturesTrialRow[]) {
	const scoredTrials = trials.filter((t) => t.scored);
	const totalQuestions = trials.length;
	const scoredCount = scoredTrials.length;
	const correctCount = scoredTrials.filter((t) => t.isCorrect === true).length;
	const maxScore = scoredCount;
	const accuracy = maxScore ? correctCount / maxScore : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalQuestions
		? Math.round(totalDurationMs / totalQuestions)
		: 0;

	return { totalQuestions, scoredCount, correctCount, maxScore, accuracy, totalDurationMs, averageResponseTimeMs };
}

export function kindLabel(kind: string): string {
	switch (kind) {
		case 'binary': return 'Да/Нет';
		case 'choice': return 'Выбор';
		case 'observe': return 'Наблюдение';
		default: return kind;
	}
}
```

**Verify**: File saved.

### Step 7: Create ResultsChart.svelte

Create `src/lib/exercises/pictures/ResultsChart.svelte`, following the emoji `ResultsChart.svelte` pattern:

- Chart type: `line`
- X axis: Question number (1-based `questionIndex`)
- Y axis: `reactionTimeMs`
- Point colors: green for `isCorrect === true`, red for `isCorrect === false`, gray for `isCorrect === null` (unscored)
- Dashed horizontal annotation line at average response time
- Custom legend: 4 items (average line, correct dot, error dot, unscored dot)
- Tooltips:
  - Title: `Вопрос {x} ({kindLabel})`
  - AfterTitle: scored ? `{isCorrect ? 'Верно' : 'Ошибка'}` : 'Не оценивается'
  - BeforeBody: `Ответ: {answer ?? "(нет)"}`
  - Label: `Реакция: {formatMs(y)}`
- X-axis ticks colored per question result
- Use `getCSSVar` from `$lib/utils` for colors

**Verify**: `npm run check` → exit 0

### Step 8: Update Result.svelte

Replace `src/lib/exercises/pictures/Result.svelte` with the per-trial pattern:

```svelte
<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { PicturesTrialRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as PicturesTrialRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Правильных</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.maxScore}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.maxScore ? Math.round(s.accuracy * 100) : 0}%</strong
		>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Вопросов</span>
		<strong class="text-base sm:text-2xl">{s.totalQuestions}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-center text-xs opacity-70 sm:mb-2 sm:text-sm">Среднее время</span
		>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
</div>

<ResultsChart questions={rows} />
```

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

### Step 9: Reset dev DB and verify end-to-end

1. Delete the old SQLite file: `rm sqlite.db sqlite.db-shm sqlite.db-wal`
2. Run `npm run init-db-dev`
3. Run `npm run dev`, play a pictures game, verify data saves and results render

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

## Test plan

- Manual testing:
  - Play all 10 questions of the pictures game
  - Verify results page shows 4-cell summary (correct/max, accuracy, total questions, avg time)
  - Verify chart renders with 10 data points: green for correct, red for wrong, gray for unscored
  - Verify tooltips show question kind, answer, and correctness
  - Test both "answer" and "observe" question types appear correctly

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "PicturesResult" src/` returns no matches (only `PicturesTrialRow` remains)
- [ ] `grep -rn "score:" src/lib/exercises/pictures/` only in results-adapter.ts (derived, not stored)
- [ ] No files outside the in-scope list are modified (`git diff --stat`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- The `AnswerRecord` type, `answers` record, or `answerTimings` record has been removed or restructured in `PicturesGame.svelte`.

## Maintenance notes

- `isCorrect` is nullable: `null` for unscored questions, `true`/`false` for scored ones. Queries filtering on correctness must handle nulls explicitly (`is_correct IS TRUE` in SQL, `.filter(t => t.isCorrect === true)` in JS).
- `questionKind` is stored as a string enum. If new question kinds are added, the `kindLabel()` helper in results-adapter.ts needs updating.
- The `answer` column stores the raw option value (e.g. `"yes"`, `"no"`, `"4"`, `"brown"`). It does NOT store the label text. If future display needs labels, they must be derived from the question config (which is hardcoded in PicturesGame.svelte, not in the DB).
