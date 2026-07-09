# Plan 016: Migrate letters exercise from per-session to per-trial DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7a66a00..HEAD -- src/lib/exercises/letters/ src/lib/server/db/models/exercises.ts src/lib/server/db/controllers/result.ts src/lib/exercises/types.ts`
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

The letters exercise stores one aggregate row per session (maxSpan, roundsCompleted, elapsed, timeoutTriggered). The game already collects per-round data in `answerLog: RoundEntry[]` (target sequence, submitted sequence, isCorrect, reactionTimeMs, letterCount) — but discards it after computing aggregates. Migrating to per-trial rows preserves the granular data, enabling time-series charts, span progression analysis, and better longitudinal tracking.

## Current state

- `src/lib/exercises/letters/types.ts` — defines `RoundEntry` (per-round, in-memory) and `LettersResult` (aggregate, sent to DB)
- `src/lib/exercises/letters/LettersGame.svelte` — game component; collects `answerLog: RoundEntry[]` but sends only aggregates via `sendResults([result])`
- `src/lib/exercises/letters/Playground.svelte` — thin wrapper passing `gameEnd` and `sendResults` props
- `src/lib/exercises/letters/Result.svelte` — iterates aggregate rows, shows 3 stat cards per row + timeout badge
- `src/lib/server/db/models/exercises.ts` — `lettersAttempt` table with aggregate columns
- `src/lib/server/db/controllers/result.ts` — maps `letters` type to table/query/orderBy
- `src/lib/exercises/types.ts` — `LettersResult` used in `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

### Current `LettersResult` type (`src/lib/exercises/letters/types.ts`):
```ts
export type LettersResult = {
	maxSpan: number;
	roundsCompleted: number;
	elapsed: number;
	timeoutTriggered: boolean;
};
```

### Current `RoundEntry` type (`src/lib/exercises/letters/types.ts`):
```ts
export type RoundEntry = {
	target: string;
	submitted: string;
	isCorrect: boolean;
	reactionTimeMs: number;
	letterCount: number;
};
```

### Current DB table (`src/lib/server/db/models/exercises.ts:39-52`):
```ts
export const lettersAttempt = sqliteTable('letters_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	maxSpan: integer('max_span').notNull(),
	roundsCompleted: integer('rounds_completed').notNull(),
	elapsed: integer('elapsed').notNull(),
	timeoutTriggered: integer('time_limit', { mode: 'boolean' }).notNull(),
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Current `endGame()` in LettersGame.svelte (`LettersGame.svelte:126-139`):
```ts
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
```

### Reference: migrated emoji pattern
See `src/lib/exercises/emoji/types.ts`, `src/lib/exercises/emoji/results-adapter.ts`, `src/lib/exercises/emoji/Result.svelte`, `src/lib/exercises/emoji/ResultsChart.svelte` for the per-trial pattern to follow.

### Conventions from `src/lib/exercises/CONVENTIONS.md`:
- Per-trial pattern: one row = one user action/answer
- `orderByMap` uses the trial index column (e.g. `asc(f.trialIndex)`)
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
- `src/lib/exercises/letters/types.ts`
- `src/lib/exercises/letters/LettersGame.svelte`
- `src/lib/exercises/letters/Result.svelte`
- `src/lib/exercises/letters/results-adapter.ts` (create)
- `src/lib/exercises/letters/ResultsChart.svelte` (create)
- `src/lib/server/db/models/exercises.ts`
- `src/lib/server/db/controllers/result.ts`
- `src/lib/exercises/types.ts`

**Out of scope** (do NOT touch):
- `src/lib/exercises/letters/About.svelte`
- `src/lib/exercises/letters/Playground.svelte` — already passes `sendResults` through; no change needed
- Any other exercise's files

## Steps

### Step 1: Define new per-trial type

Replace `LettersResult` in `src/lib/exercises/letters/types.ts` with `LettersTrialRow`. Keep `RoundEntry` if other code uses it, otherwise remove it:

```ts
export type LettersTrialRow = {
	roundIndex: number;
	target: string;
	submitted: string;
	isCorrect: boolean;
	reactionTimeMs: number;
	letterCount: number;
	timeoutTriggered: boolean;
	elapsed: number;
};
```

Note: `timeoutTriggered` and `elapsed` are session-level facts stored on every row so the adapter can derive them without a separate session query.

**Verify**: File saved.

### Step 2: Replace DB table schema

In `src/lib/server/db/models/exercises.ts`, replace the `lettersAttempt` table definition with:

```ts
export const lettersAttempt = sqliteTable('letters_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	roundIndex: integer('round_index').notNull(),
	target: text('target').notNull(),
	submitted: text('submitted').notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	letterCount: integer('letter_count').notNull(),
	timeoutTriggered: integer('time_limit', { mode: 'boolean' }).notNull(),
	elapsed: integer('elapsed').notNull(),
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
letters: (f) => asc(f.attempt),
```
to:
```ts
letters: (f) => asc(f.roundIndex),
```

The `attemptTableMap` and `queryTableMap` entries remain the same.

**Verify**: File saved.

### Step 4: Update central types

In `src/lib/exercises/types.ts`:

Change the import from:
```ts
import type { LettersResult } from './letters/types';
```
to:
```ts
import type { LettersTrialRow } from './letters/types';
```

Update `ExerciseResultMap`:
```ts
letters: LettersTrialRow;
```

Update `ExerciseResult` union — replace `LettersResult` with `LettersTrialRow`.

Update `ExerciseResults` union — replace `LettersResult[]` with `LettersTrialRow[]`.

**Verify**: `npm run check` — may still fail on game component.

### Step 5: Update LettersGame.svelte to send per-trial rows

In `src/lib/exercises/letters/LettersGame.svelte`:

1. Change the import from `LettersResult` to `LettersTrialRow` (update the type import).

2. Update the `sendResults` prop type from `LettersResult[]` to `LettersTrialRow[]`.

3. Replace `endGame()` to send the `answerLog` as `LettersTrialRow[]`:

```ts
function endGame() {
	stopTimers();
	started = false;
	finished = true;
	numLetters = START_LENGTH;
	const trialRows: LettersTrialRow[] = answerLog.map((r, i) => ({
		roundIndex: i + 1,
		target: r.target,
		submitted: r.submitted,
		isCorrect: r.isCorrect,
		reactionTimeMs: r.reactionTimeMs,
		letterCount: r.letterCount,
		timeoutTriggered,
		elapsed
	}));
	sendResults(trialRows);
	gameEnd();
}
```

4. The `RoundEntry` type can be removed if it was only used locally — its fields are now part of `LettersTrialRow`. If `RoundEntry` is still used in `types.ts`, keep it but it's no longer sent to the server.

**Verify**: `npm run check` → exit 0

### Step 6: Create results-adapter.ts

Create `src/lib/exercises/letters/results-adapter.ts`:

```ts
import type { LettersTrialRow } from './types';

export type { LettersTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: LettersTrialRow[]) {
	const totalRounds = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const maxSpan = trials.reduce((max, t) => (t.isCorrect ? Math.max(max, t.letterCount) : max), 0);
	const accuracy = totalRounds ? correctCount / totalRounds : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalRounds ? Math.round(totalDurationMs / totalRounds) : 0;
	const timeoutTriggered = trials.length > 0 ? trials[0].timeoutTriggered : false;
	const elapsed = trials.length > 0 ? trials[0].elapsed : 0;

	return {
		totalRounds,
		correctCount,
		maxSpan,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		timeoutTriggered,
		elapsed
	};
}
```

**Verify**: File saved.

### Step 7: Create ResultsChart.svelte

Create `src/lib/exercises/letters/ResultsChart.svelte`, following the emoji `ResultsChart.svelte` pattern (`src/lib/exercises/emoji/ResultsChart.svelte`):

- Chart type: `line`
- X axis: Round number (1-based `roundIndex`)
- Y axis: `reactionTimeMs`
- Point colors: green for `isCorrect`, red for error
- Dashed horizontal annotation line at average response time
- Custom legend: 3 items (average line, correct dot, error dot)
- Tooltips:
  - Title: `Раунд {x}`
  - AfterTitle: `Букв: {letterCount} — {isCorrect ? 'Верно' : 'Ошибка'}`
  - BeforeBody: `Цель: {target} → Ответ: {submitted}`
  - Label: `Реакция: {formatMs(y)}`
- X-axis ticks colored green/red per round correctness
- Use `getCSSVar` from `$lib/utils` for colors

**Verify**: `npm run check` → exit 0

### Step 8: Update Result.svelte

Replace `src/lib/exercises/letters/Result.svelte` with the per-trial pattern:

```svelte
<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { LettersTrialRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as LettersTrialRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Max span</span>
		<strong class="text-base sm:text-2xl">{s.maxSpan}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Раундов</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalRounds}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Среднее время</span>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Время</span>
		<strong class="text-base sm:text-2xl">{s.elapsed} сек</strong>
	</div>
</div>

{#if s.timeoutTriggered}
	<p class="text-center text-sm font-semibold text-red-400">Время вышло</p>
{/if}

<ResultsChart rounds={rows} />
```

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

### Step 9: Reset dev DB and verify end-to-end

1. Delete the old SQLite file: `rm sqlite.db sqlite.db-shm sqlite.db-wal`
2. Run `npm run init-db-dev` to recreate with new schema.
3. Run `npm run dev`, play a letters game, verify:
   - Data is saved (no server error)
   - Results page renders with summary header + chart
   - Chart shows green/red dots per round

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

## Test plan

- Manual testing only:
  - Play a letters game until failure (wrong answer)
  - Verify results page shows 4-cell summary (max span, rounds correct/total, avg time, total time)
  - Verify chart renders with data points, green for correct rounds, red for wrong
  - Play a game that hits the 60s timeout — verify timeout badge shows
  - Verify tooltips show target vs submitted sequences

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "LettersResult" src/` returns no matches (only `LettersTrialRow` remains)
- [ ] `grep -rn "asc(f.attempt)" src/lib/server/db/controllers/result.ts` does NOT match letters
- [ ] No files outside the in-scope list are modified (`git diff --stat`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- The `answerLog` variable or `RoundEntry` type has been removed or restructured in `LettersGame.svelte`.

## Maintenance notes

- `timeoutTriggered` and `elapsed` are stored on every trial row (session-level facts). If future schema normalization removes them, the adapter will need a separate session query.
- `maxSpan` is derived at read time. If a leaderboard feature needs it, consider a materialized column.
- The `target` and `submitted` fields store letter sequences as strings (e.g. "БВГД"). If analysis needs per-letter accuracy, that can be derived from these strings.
