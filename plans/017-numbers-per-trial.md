# Plan 017: Migrate numbers exercise from per-session to per-trial DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7a66a00..HEAD -- src/lib/exercises/numbers/ src/lib/server/db/models/exercises.ts src/lib/server/db/controllers/result.ts src/lib/exercises/types.ts`
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

The numbers exercise stores one aggregate row per session (correct, total, digitSpan). The game already collects per-level data in `acceptedReviews: LevelReview[]` (level number, target sequence, submitted sequence, isCorrect, reactionTimeMs) — and even sends it in `NumbersResult.reviews`, but the DB schema has no columns for it, so Drizzle silently drops it. Migrating to per-trial rows preserves this granular data, enabling digit span progression analysis and per-level detail in the results chart. Additionally, the game currently sets `reactionTimeMs: 0` for every level — this plan also adds proper reaction time tracking.

## Current state

- `src/lib/exercises/numbers/types.ts` — defines `LevelReview` (per-level) and `NumbersResult` (aggregate + reviews array)
- `src/lib/exercises/numbers/NumbersGame.svelte` — game component; collects `acceptedReviews: LevelReview[]` and sends `NumbersResult` with `reviews` array that gets silently dropped by DB
- `src/lib/exercises/numbers/Playground.svelte` — thin wrapper passing `gameEnd` and `sendResults` props
- `src/lib/exercises/numbers/Result.svelte` — iterates aggregate rows, shows 2 stat cards per row
- `src/lib/server/db/models/exercises.ts` — `numbersAttempt` table with aggregate columns only
- `src/lib/server/db/controllers/result.ts` — maps `numbers` type to table/query/orderBy
- `src/lib/exercises/types.ts` — `NumbersResult` used in `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

### Current `NumbersResult` and `LevelReview` types (`src/lib/exercises/numbers/types.ts`):
```ts
export type LevelReview = {
	level: number;
	sequence: number[];
	submitted: number[];
	isCorrect: boolean;
	reactionTimeMs: number;
};

export type NumbersResult = {
	correct: number;
	total: number;
	digitSpan: number;
	reviews: LevelReview[];
};
```

### Current DB table (`src/lib/server/db/models/exercises.ts:73-85`):
```ts
export const numbersAttempt = sqliteTable('numbers_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	correct: integer('correct').notNull(),
	total: integer('total').notNull(),
	digitSpan: integer('digit_span').notNull(),
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Current `submitLevel()` in NumbersGame.svelte (`NumbersGame.svelte:104-129`):
```ts
const submitLevel = () => {
	// ... validation ...
	currentReview = {
		level: currentLevelNumber(),
		sequence: [...currentSequence],
		submitted,
		isCorrect: submitted.every((v, i) => v === currentSequence[i]),
		reactionTimeMs: 0
	};
	phase = 'review';
};
```

Note: `reactionTimeMs` is always `0` — the game never tracks the actual time the user takes to type their answer.

### Current `continueAfterReview()` (`NumbersGame.svelte:132-151`):
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
- `src/lib/exercises/numbers/types.ts`
- `src/lib/exercises/numbers/NumbersGame.svelte`
- `src/lib/exercises/numbers/Result.svelte`
- `src/lib/exercises/numbers/results-adapter.ts` (create)
- `src/lib/exercises/numbers/ResultsChart.svelte` (create)
- `src/lib/server/db/models/exercises.ts`
- `src/lib/server/db/controllers/result.ts`
- `src/lib/exercises/types.ts`

**Out of scope** (do NOT touch):
- `src/lib/exercises/numbers/About.svelte`
- `src/lib/exercises/numbers/Playground.svelte` — already passes `sendResults` through
- Any other exercise's files

## Steps

### Step 1: Define new per-trial type

Replace types in `src/lib/exercises/numbers/types.ts` with `NumbersTrialRow`:

```ts
export type NumbersTrialRow = {
	levelIndex: number;
	level: number;
	digitCount: number;
	mode: string;
	sequence: string;
	submitted: string;
	isCorrect: boolean;
	reactionTimeMs: number;
};
```

Note: `sequence` and `submitted` are stored as JSON-stringified arrays (e.g. `"[7,12,4]"`) since Drizzle doesn't have a native array type. The adapter will parse them back when needed. `levelIndex` is 1-based position; `level` is the game's level number; `digitCount` is how many numbers were in the sequence; `mode` is `"single"` or `"mixed"`.

**Verify**: File saved.

### Step 2: Replace DB table schema

In `src/lib/server/db/models/exercises.ts`, replace the `numbersAttempt` table definition with:

```ts
export const numbersAttempt = sqliteTable('numbers_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	levelIndex: integer('level_index').notNull(),
	level: integer('level').notNull(),
	digitCount: integer('digit_count').notNull(),
	mode: text('mode').notNull(),
	sequence: text('sequence').notNull(),
	submitted: text('submitted').notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

**Verify**: File saved.

### Step 3: Update controller mappings

In `src/lib/server/db/controllers/result.ts`:

Change the `orderByMap` entry from:
```ts
numbers: (f) => asc(f.attempt),
```
to:
```ts
numbers: (f) => asc(f.levelIndex),
```

**Verify**: File saved.

### Step 4: Update central types

In `src/lib/exercises/types.ts`:

Change the import from:
```ts
import type { NumbersResult } from './numbers/types';
```
to:
```ts
import type { NumbersTrialRow } from './numbers/types';
```

Update `ExerciseResultMap`:
```ts
numbers: NumbersTrialRow;
```

Update `ExerciseResult` union — replace `NumbersResult` with `NumbersTrialRow`.

Update `ExerciseResults` union — replace `NumbersResult[]` with `NumbersTrialRow[]`.

**Verify**: `npm run check` — may still fail on game component.

### Step 5: Update NumbersGame.svelte to send per-trial rows and track reaction time

In `src/lib/exercises/numbers/NumbersGame.svelte`:

1. Change the import from `NumbersResult` to `NumbersTrialRow`.

2. Update the `sendResults` prop type from `NumbersResult[]` to `NumbersTrialRow[]`.

3. Add a `inputStartedAt` variable to track when the input phase starts. Add this line at the end of `startLevel()` (after `phase = 'memorize'`):
   ```ts
   inputStartedAt = 0; // reset; will be set when input phase begins
   ```
   And in the `revealTimeout` callback where `phase = 'input'` is set (`NumbersGame.svelte:85-87`), add:
   ```ts
   inputStartedAt = Date.now();
   ```

4. Replace `submitLevel()` to populate `reactionTimeMs` properly:
   ```ts
   const submitLevel = () => {
   	if (recallInput.trim() === '') {
   		validationMessage = 'Введите всю последовательность чисел в одно поле.';
   		return;
   	}
   	const parts = recallInput
   		.trim()
   		.split(/[\s,;]+/)
   		.filter(Boolean);
   	const submitted = parts.map((v) => Number(v));
   	if (submitted.length !== currentSequence.length) {
   		validationMessage = `Нужно ввести ${currentSequence.length} чисел в том же порядке.`;
   		return;
   	}
   	if (submitted.some((v) => !Number.isInteger(v) || v < 1 || v > 99)) {
   		validationMessage = 'Можно вводить только целые числа от 1 до 99.';
   		return;
   	}
   	const reactionTimeMs = inputStartedAt > 0 ? Date.now() - inputStartedAt : 0;
   	currentReview = {
   		level: currentLevelNumber(),
   		sequence: [...currentSequence],
   		submitted,
   		isCorrect: submitted.every((v, i) => v === currentSequence[i]),
   		reactionTimeMs
   	};
   	phase = 'review';
   };
   ```

5. Replace `continueAfterReview()` to send per-trial rows:
   ```ts
   const continueAfterReview = () => {
   	if (!currentReview) return;
   	acceptedReviews = [...acceptedReviews, currentReview];
   	if (isLastLevel()) {
   		clearTimers();
   		const config = levelConfigs[currentReview.level - 1];
   		const trialRows: NumbersTrialRow[] = acceptedReviews.map((r, i) => ({
   			levelIndex: i + 1,
   			level: r.level,
   			digitCount: levelConfigs[r.level - 1].count,
   			mode: levelConfigs[r.level - 1].mode,
   			sequence: JSON.stringify(r.sequence),
   			submitted: JSON.stringify(r.submitted),
   			isCorrect: r.isCorrect,
   			reactionTimeMs: r.reactionTimeMs
   		}));
   		sendResults(trialRows);
   		gameEnd();
   		return;
   	}
   	startLevel(currentLevelIndex + 1);
   };
   ```

**Verify**: `npm run check` → exit 0

### Step 6: Create results-adapter.ts

Create `src/lib/exercises/numbers/results-adapter.ts`:

```ts
import type { NumbersTrialRow } from './types';

export type { NumbersTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: NumbersTrialRow[]) {
	const totalLevels = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const digitSpan = trials.reduce((max, t) => (t.isCorrect ? Math.max(max, t.digitCount) : max), 0);
	const accuracy = totalLevels ? correctCount / totalLevels : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalLevels ? Math.round(totalDurationMs / totalLevels) : 0;

	return { totalLevels, correctCount, digitSpan, accuracy, totalDurationMs, averageResponseTimeMs };
}
```

**Verify**: File saved.

### Step 7: Create ResultsChart.svelte

Create `src/lib/exercises/numbers/ResultsChart.svelte`, following the emoji `ResultsChart.svelte` pattern:

- Chart type: `line`
- X axis: Level number (1-based `levelIndex`)
- Y axis: `reactionTimeMs`
- Point colors: green for `isCorrect`, red for error
- Dashed horizontal annotation line at average response time
- Custom legend: 3 items (average line, correct dot, error dot)
- Tooltips:
  - Title: `Уровень {x} (mode: {mode}, {digitCount} цифр)`
  - BeforeBody: parse `sequence` and `submitted` from JSON, show `Ожидалось: [7, 12, 4] → Ответ: [7, 12, 5]`
  - Label: `Реакция: {formatMs(y)} ({isCorrect ? 'Верно' : 'Ошибка'})`
- X-axis ticks colored green/red per level correctness
- Use `getCSSVar` from `$lib/utils` for colors

**Verify**: `npm run check` → exit 0

### Step 8: Update Result.svelte

Replace `src/lib/exercises/numbers/Result.svelte` with the per-trial pattern:

```svelte
<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { NumbersTrialRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as NumbersTrialRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Верно</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalLevels}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.totalLevels ? Math.round(s.accuracy * 100) : 0}%</strong
		>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Max span</span>
		<strong class="text-base sm:text-2xl">{s.digitSpan}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Среднее время</span>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
</div>

<ResultsChart levels={rows} />
```

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

### Step 9: Reset dev DB and verify end-to-end

1. Delete the old SQLite file: `rm sqlite.db sqlite.db-shm sqlite.db-wal`
2. Run `npm run init-db-dev`
3. Run `npm run dev`, play a numbers game, verify data saves and results render

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

## Test plan

- Manual testing:
  - Play all 8 levels of the numbers game
  - Verify results page shows 4-cell summary (correct/total, accuracy, max span, avg time)
  - Verify chart renders with 8 data points, green for correct, red for errors
  - Verify tooltips show the sequence vs submitted comparison
  - Try a "repeat level" — verify reaction time is still tracked correctly after repeating

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "NumbersResult" src/` returns no matches (only `NumbersTrialRow` remains)
- [ ] `reactionTimeMs` is no longer always `0` in submitted levels
- [ ] No files outside the in-scope list are modified (`git diff --stat`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- The `LevelReview` type or `acceptedReviews` variable has been removed or restructured in `NumbersGame.svelte`.

## Maintenance notes

- `sequence` and `submitted` are stored as JSON strings. If querying by individual digit is needed, consider a separate table or computed column.
- `reactionTimeMs` was previously always 0. After this migration, old data (if not dropped) would have 0s. Since we're dropping the DB in dev, this is not an issue. In production, a migration would need to handle this.
- `digitCount` is denormalized (derivable from `level` + `levelConfigs`). Storing it avoids joining with game config at read time.
