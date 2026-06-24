# Plan 015: Migrate flanker exercise from per-session to per-trial DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4556774..HEAD -- src/lib/exercises/flanker/ src/lib/server/db/models/exercises.ts src/lib/server/db/controllers/result.ts src/lib/exercises/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `4556774`, 2026-06-24

## Why this matters

The flanker exercise currently stores one aggregate row per session (correct count, avg RTs, flanker effect). The game already collects rich per-trial data in `answerLog: AnswerEntry[]` (trial arrows, target direction, selected direction, congruent flag, isCorrect, reactionTimeMs) — but discards it all after computing aggregates. Migrating to per-trial rows preserves this granular data, enabling time-series charts, per-congruence analysis, and better longitudinal tracking. This is the most impactful migration because flanker's discarded data is the richest of the 5 legacy exercises.

## Current state

- `src/lib/exercises/flanker/types.ts` — defines `FlankerResult` (aggregate) and `AnswerEntry` (per-trial, in-memory only)
- `src/lib/exercises/flanker/FlankerGame.svelte` — game component; collects `answerLog: AnswerEntry[]` but sends only aggregates via `sendResults([result])`
- `src/lib/exercises/flanker/Playground.svelte` — thin wrapper passing `gameEnd` and `sendResults` props
- `src/lib/exercises/flanker/Result.svelte` — iterates aggregate rows, shows 4 stat cards per row
- `src/lib/server/db/models/exercises.ts` — `flankerAttempt` table with aggregate columns
- `src/lib/server/db/controllers/result.ts` — maps `flanker` type to table/query/orderBy
- `src/lib/exercises/types.ts` — `FlankerResult` used in `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

### Current `FlankerResult` type (`src/lib/exercises/flanker/types.ts`):
```ts
export type FlankerResult = {
	correctAnswers: number;
	totalTrials: number;
	elapsedTime: number;
	timeLimit: boolean;
	avgRtCongruentMs: number;
	avgRtIncongruentMs: number;
	flankerEffectMs: number;
	errors: number;
};
```

### Current `AnswerEntry` type (defined locally in `FlankerGame.svelte:30-37`):
```ts
type AnswerEntry = {
	trial: string[];
	target: string;
	selected: string;
	isCorrect: boolean;
	congruent: boolean;
	reactionTimeMs: number;
};
```

### Current DB table (`src/lib/server/db/models/exercises.ts:54-71`):
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
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Current `finishTest()` in FlankerGame.svelte (`FlankerGame.svelte:116-143`):
```ts
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
```

### Reference: migrated `EmojiTrialRow` pattern (`src/lib/exercises/emoji/types.ts`):
```ts
export type EmojiTrialRow = {
	trialIndex: number;
	previousEmoji: string;
	currentEmoji: string;
	actualChanged: boolean;
	userSaidChanged: boolean;
	isCorrect: boolean;
	reactionTimeMs: number;
};
```

### Reference: migrated emoji DB table (`src/lib/server/db/models/exercises.ts:22-37`):
```ts
export const emojiAttempt = sqliteTable('emoji_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	trialIndex: integer('trial_index').notNull(),
	previousEmoji: text('previous_emoji').notNull(),
	currentEmoji: text('current_emoji').notNull(),
	actualChanged: integer('actual_changed', { mode: 'boolean' }).notNull(),
	userSaidChanged: integer('user_said_changed', { mode: 'boolean' }).notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Reference: emoji results-adapter.ts (`src/lib/exercises/emoji/results-adapter.ts`):
```ts
import type { EmojiTrialRow } from './types';
export type { EmojiTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: EmojiTrialRow[]) {
	const totalTrials = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const accuracy = totalTrials ? correctCount / totalTrials : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalTrials ? Math.round(totalDurationMs / totalTrials) : 0;
	return { totalTrials, correctCount, accuracy, totalDurationMs, averageResponseTimeMs };
}
```

### Reference: emoji Result.svelte (`src/lib/exercises/emoji/Result.svelte`):
Summary header (4 cards: correct/total, accuracy %, avg time, total answers) + `<ResultsChart>` chart. Uses `results as EmojiTrialRow[]` cast, calls `summary(rows)`.

### Conventions from `src/lib/exercises/CONVENTIONS.md`:
- Per-trial pattern: one row = one user action/answer
- `orderByMap` uses the trial index column (e.g. `asc(f.trialIndex)`)
- `results-adapter.ts` provides `summary()` to derive aggregates
- `Result.svelte` shows summary header + `<ResultsChart>` chart
- `ResultsChart.svelte` renders a Chart.js line chart with per-trial dots (green=correct, red=error)

### Repo style notes:
- Tabs (width 4), single quotes, no trailing commas, print width 100
- Svelte 5 runes (`$state`, `$props`, `$derived`)
- No comments in code unless explicitly asked

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Dev DB    | `npm run init-db-dev`            | exit 0              |
| Typecheck | `npm run check`                  | exit 0, no errors   |
| Lint      | `npm run lint`                   | exit 0              |
| Dev       | `npm run dev`                    | server starts        |

## Scope

**In scope** (the only files you should modify):
- `src/lib/exercises/flanker/types.ts`
- `src/lib/exercises/flanker/FlankerGame.svelte`
- `src/lib/exercises/flanker/Result.svelte`
- `src/lib/exercises/flanker/results-adapter.ts` (create)
- `src/lib/exercises/flanker/ResultsChart.svelte` (create)
- `src/lib/server/db/models/exercises.ts`
- `src/lib/server/db/controllers/result.ts`
- `src/lib/exercises/types.ts`

**Out of scope** (do NOT touch):
- `src/lib/exercises/flanker/About.svelte`
- `src/lib/exercises/flanker/Playground.svelte` — already passes `sendResults` through; no change needed
- `src/routes/(app)/exercises/[slug]/playground/+server.ts` — already has `'flanker': 'flanker'` mapping
- `src/routes/(app)/exercises/[slug]/results/+page.server.ts` — already has flanker mapping
- Any other exercise's files

## Steps

### Step 1: Define new per-trial type

Replace `FlankerResult` in `src/lib/exercises/flanker/types.ts` with `FlankerTrialRow`:

```ts
export type FlankerTrialRow = {
	trialIndex: number;
	target: string;
	selected: string;
	isCorrect: boolean;
	congruent: boolean;
	reactionTimeMs: number;
	timeLimit: boolean;
	elapsedTime: number;
};
```

Keep `FlankerResult` as a deprecated alias temporarily if needed for backward compat, but since we're dropping the DB, it can be removed.

**Verify**: `npm run check` → should fail (types not yet updated everywhere) — this is expected, will pass after step 4.

### Step 2: Replace DB table schema

In `src/lib/server/db/models/exercises.ts`, replace the `flankerAttempt` table definition with:

```ts
export const flankerAttempt = sqliteTable('flanker_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	trialIndex: integer('trial_index').notNull(),
	target: text('target').notNull(),
	selected: text('selected').notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	congruent: integer('congruent', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	timeLimit: integer('time_limit', { mode: 'boolean' }).notNull(),
	elapsedTime: integer('elapsed_time').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Note: `timeLimit` and `elapsedTime` are stored on every row (session-level facts) so the results adapter can derive them without a separate query. This is a small redundancy that simplifies the read path.

**Verify**: File saved, no syntax errors.

### Step 3: Update controller mappings

In `src/lib/server/db/controllers/result.ts`:

Change the `orderByMap` entry from:
```ts
flanker: (f) => asc(f.attempt),
```
to:
```ts
flanker: (f) => asc(f.trialIndex),
```

The `attemptTableMap` and `queryTableMap` entries remain the same (they reference the table object, not its columns).

**Verify**: File saved.

### Step 4: Update central types

In `src/lib/exercises/types.ts`:

Change the import from:
```ts
import type { FlankerResult } from './flanker/types';
```
to:
```ts
import type { FlankerTrialRow } from './flanker/types';
```

Update `ExerciseResultMap`:
```ts
flanker: FlankerTrialRow;
```

Update `ExerciseResult` union:
```ts
| FlankerTrialRow
```

Update `ExerciseResults` union:
```ts
| FlankerTrialRow[]
```

(Replace every occurrence of `FlankerResult` with `FlankerTrialRow`.)

**Verify**: `npm run check` → should now pass (or fail only on game component not yet updated).

### Step 5: Update FlankerGame.svelte to send per-trial rows

In `src/lib/exercises/flanker/FlankerGame.svelte`:

1. Change the `sendResults` prop type from `FlankerResult[]` to `FlankerTrialRow[]` (update the import).

2. Replace `finishTest()` to send the `answerLog` as `FlankerTrialRow[]`:

```ts
function finishTest() {
	if (testFinished) return;
	stopTimer();
	testFinished = true;
	currentTrial = null;

	const trialRows: FlankerTrialRow[] = answerLog.map((a, i) => ({
		trialIndex: i + 1,
		target: a.target,
		selected: a.selected,
		isCorrect: a.isCorrect,
		congruent: a.congruent,
		reactionTimeMs: a.reactionTimeMs,
		timeLimit,
		elapsedTime
	}));

	sendResults(trialRows);
	gameEnd();
}
```

3. Remove the aggregate computation code (congruentRts, incongruentRts, avg, avgRtCongruentMs, avgRtIncongruentMs, errors variables in finishTest).

4. The `AnswerEntry` local type can be removed — its fields are now part of `FlankerTrialRow`.

**Verify**: `npm run check` → exit 0

### Step 6: Create results-adapter.ts

Create `src/lib/exercises/flanker/results-adapter.ts`:

```ts
import type { FlankerTrialRow } from './types';

export type { FlankerTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: FlankerTrialRow[]) {
	const totalTrials = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const errors = totalTrials - correctCount;
	const accuracy = totalTrials ? correctCount / totalTrials : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalTrials ? Math.round(totalDurationMs / totalTrials) : 0;

	const congruentTrials = trials.filter((t) => t.congruent);
	const incongruentTrials = trials.filter((t) => !t.congruent);
	const avgRtCongruentMs = congruentTrials.length
		? Math.round(congruentTrials.reduce((s, t) => s + t.reactionTimeMs, 0) / congruentTrials.length)
		: 0;
	const avgRtIncongruentMs = incongruentTrials.length
		? Math.round(incongruentTrials.reduce((s, t) => s + t.reactionTimeMs, 0) / incongruentTrials.length)
		: 0;
	const flankerEffectMs = avgRtIncongruentMs - avgRtCongruentMs;

	const timeLimit = trials.length > 0 ? trials[0].timeLimit : false;
	const elapsedTime = trials.length > 0 ? trials[0].elapsedTime : 0;

	return {
		totalTrials,
		correctCount,
		errors,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		avgRtCongruentMs,
		avgRtIncongruentMs,
		flankerEffectMs,
		timeLimit,
		elapsedTime
	};
}
```

**Verify**: File saved, no syntax errors.

### Step 7: Create ResultsChart.svelte

Create `src/lib/exercises/flanker/ResultsChart.svelte`, following the emoji `ResultsChart.svelte` pattern (`src/lib/exercises/emoji/ResultsChart.svelte`):

- Chart type: `line`
- X axis: Trial number (1-based `trialIndex`)
- Y axis: `reactionTimeMs`
- Point colors: green for `isCorrect`, red for error
- Dashed horizontal annotation line at average response time
- Custom legend: 3 items (average line, correct dot, error dot)
- Tooltips:
  - Title: `Испытание {x}`
  - AfterTitle: `Цель: {target} → Выбор: {selected}`
  - BeforeBody: `Тип: {congruent ? 'Конгруэнтный' : 'Неконгруэнтный'}`
  - Label: `Реакция: {formatMs(y)} ({isCorrect ? 'Верно' : 'Ошибка'})`
- X-axis ticks colored green/red per trial correctness
- Use `getCSSVar` from `$lib/utils` for colors

**Verify**: `npm run check` → exit 0

### Step 8: Update Result.svelte

Replace `src/lib/exercises/flanker/Result.svelte` with the per-trial pattern:

```svelte
<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { FlankerTrialRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as FlankerTrialRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Верно</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalTrials}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.totalTrials ? Math.round(s.accuracy * 100) : 0}%</strong
		>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="text-center mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm"
			>Flanker-эффект</span
		>
		<strong class="text-base sm:text-2xl">{formatMs(s.flankerEffectMs)}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-center text-xs opacity-70 sm:mb-2 sm:text-sm">Среднее время</span
		>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
</div>

<ResultsChart trials={rows} />
```

**Verify**: `npm run check` → exit 0

### Step 9: Reset dev DB and verify end-to-end

1. Delete the old SQLite file:
   ```
   rm sqlite.db sqlite.db-shm sqlite.db-wal
   ```

2. Run `npm run init-db-dev` to recreate with new schema.

3. Run `npm run dev`, play a flanker game, verify:
   - Data is saved (no server error)
   - Results page renders with summary header + chart
   - Chart shows green/red dots per trial

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

## Test plan

- No automated tests exist for exercises currently. Manual testing:
  - Play a full flanker game (all 50 trials)
  - Verify results page shows 4-cell summary (correct/total, accuracy, flanker effect, avg time)
  - Verify chart renders with 50 data points, green for correct, red for errors
  - Verify congruent vs incongruent trials are distinguishable in tooltip
  - Play a game that hits the 120s time limit — verify `timeLimit` flag is preserved

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "FlankerResult" src/` returns no matches (only `FlankerTrialRow` remains)
- [ ] `grep -rn "asc(f.attempt)" src/lib/server/db/controllers/result.ts` does NOT match flanker (uses `asc(f.trialIndex)`)
- [ ] No files outside the in-scope list are modified (`git diff --stat`)
- [ ] Dev DB reset + flanker game plays + results render correctly
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- The `AnswerEntry` type or `answerLog` variable has been removed or restructured in `FlankerGame.svelte` — the migration depends on this data being available.

## Maintenance notes

- The `timeLimit` and `elapsedTime` columns are stored on every trial row (session-level facts). If future schema normalization removes them, the results adapter will need a separate session query.
- The flanker effect (avgRtIncongruent - avgRtCongruent) is derived at read time, not stored. If a future feature needs to query it directly (e.g. leaderboard), consider a materialized view.
- The `trial` field (array of 5 arrow directions) from `AnswerEntry` is NOT stored — only `target` and `selected` (the center and user's answer). If the full stimulus pattern is needed for analysis, add a `stimulus` TEXT column with JSON.stringify of the trial array.
