# Plan 019: Migrate attention exercise from per-session to per-trial DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7a66a00..HEAD -- src/lib/exercises/attention/ src/lib/server/db/models/exercises.ts src/lib/server/db/controllers/result.ts src/lib/exercises/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `7a66a00`, 2026-06-24

## Why this matters

The attention exercise stores one aggregate row per session (found, n, m, errors, elapsed). Unlike the other 4 legacy exercises, the game does NOT currently collect per-click data — it just increments `found`/`errors` counters. This migration requires both adding per-click tracking to the game AND changing the DB schema. The per-trial data (which number was clicked, whether it was a target, reaction time since last click) enables time-series analysis of attention and error patterns that the current aggregate cannot express. This is the hardest migration of the 5 because it requires game logic changes, not just reshaping existing data.

## Current state

- `src/lib/exercises/attention/types.ts` — defines `AttentionResult` (aggregate only)
- `src/lib/exercises/attention/AttentionGame.svelte` — game component; does NOT track per-click data, only increments `errors` and `found` counters
- `src/lib/exercises/attention/Playground.svelte` — thin wrapper passing `gameEnd` and `sendResults` props
- `src/lib/exercises/attention/Result.svelte` — iterates aggregate rows, shows 3 stat cards per row
- `src/lib/server/db/models/exercises.ts` — `attentionAttempt` table with aggregate columns
- `src/lib/server/db/controllers/result.ts` — maps `attention` type to table/query/orderBy
- `src/lib/exercises/types.ts` — `AttentionResult` used in `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

### Current `AttentionResult` type (`src/lib/exercises/attention/types.ts`):
```ts
export type AttentionResult = {
	n: number;
	m: number;
	errors: number;
	elapsed: number;
	found: number;
};
```

### Current `handleClick()` in AttentionGame.svelte (`AttentionGame.svelte:53-73`):
```ts
function handleClick(num: number) {
	if (!started) return;
	if (targets.has(num)) {
		found = new Set([...found, num]);
		if (found.size === targets.size) {
			stopTimer();
			started = false;
			const result: AttentionResult = {
				n: targets.size,
				m: found.size,
				errors,
				elapsed,
				found: found.size
			};
			sendResults([result]);
			gameEnd();
		}
	} else {
		errors++;
	}
}
```

Note: No per-click tracking at all. Each click either adds to `found` set or increments `errors`. No reaction time, no record of which number was clicked.

### Current DB table (`src/lib/server/db/models/exercises.ts:6-20`):
```ts
export const attentionAttempt = sqliteTable('attention_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	n: integer('n').notNull(),
	m: integer('m').notNull(),
	errors: integer('errors').notNull(),
	elapsed: integer('elapsed').notNull(),
	found: integer('found').notNull(),
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Conventions from `src/lib/exercises/CONVENTIONS.md`:
- Per-trial pattern: one row = one user action/answer
- `orderByMap` uses the trial index column
- `results-adapter.ts` provides `summary()` to derive aggregates
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
- `src/lib/exercises/attention/types.ts`
- `src/lib/exercises/attention/AttentionGame.svelte`
- `src/lib/exercises/attention/Result.svelte`
- `src/lib/exercises/attention/results-adapter.ts` (create)
- `src/lib/exercises/attention/ResultsChart.svelte` (create)
- `src/lib/server/db/models/exercises.ts`
- `src/lib/server/db/controllers/result.ts`
- `src/lib/exercises/types.ts`

**Out of scope** (do NOT touch):
- `src/lib/exercises/attention/About.svelte`
- `src/lib/exercises/attention/Playground.svelte` — already passes `sendResults` through
- Any other exercise's files

## Steps

### Step 1: Define new per-trial type

Replace `AttentionResult` in `src/lib/exercises/attention/types.ts` with `AttentionTrialRow`:

```ts
export type AttentionTrialRow = {
	clickIndex: number;
	number: number;
	isTarget: boolean;
	isCorrect: boolean;
	reactionTimeMs: number;
	totalTargets: number;
	totalNumbers: number;
};
```

Note: `number` is the numeric value the user clicked. `isTarget` is whether it was a target number. `isCorrect` is true for correct target clicks and false for error clicks on non-targets. `totalTargets` and `totalNumbers` are session-level facts stored on every row so the adapter can derive n/m without a separate query.

**Verify**: File saved.

### Step 2: Replace DB table schema

In `src/lib/server/db/models/exercises.ts`, replace the `attentionAttempt` table definition with:

```ts
export const attentionAttempt = sqliteTable('attention_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	clickIndex: integer('click_index').notNull(),
	number: integer('number').notNull(),
	isTarget: integer('is_target', { mode: 'boolean' }).notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	totalTargets: integer('total_targets').notNull(),
	totalNumbers: integer('total_numbers').notNull(),
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
attention: (f) => asc(f.attempt),
```
to:
```ts
attention: (f) => asc(f.clickIndex),
```

**Verify**: File saved.

### Step 4: Update central types

In `src/lib/exercises/types.ts`:

Change the import from:
```ts
import type { AttentionResult } from './attention/types';
```
to:
```ts
import type { AttentionTrialRow } from './attention/types';
```

Update `ExerciseResultMap`:
```ts
attention: AttentionTrialRow;
```

Update `ExerciseResult` union — replace `AttentionResult` with `AttentionTrialRow`.

Update `ExerciseResults` union — replace `AttentionResult[]` with `AttentionTrialRow[]`.

**Verify**: `npm run check` — may still fail on game component.

### Step 5: Update AttentionGame.svelte to track per-click data and send per-trial rows

In `src/lib/exercises/attention/AttentionGame.svelte`:

1. Change the import from `AttentionResult` to `AttentionTrialRow`.

2. Update the `sendResults` prop type from `AttentionResult[]` to `AttentionTrialRow[]`.

3. Add a `clickLog` array to track per-click data. Add a `lastClickAt` variable for reaction time tracking. Add these state declarations near the other state variables:
   ```ts
   let clickLog: { number: number; isTarget: boolean; isCorrect: boolean; reactionTimeMs: number }[] = [];
   let lastClickAt = 0;
   ```

4. In `generateTest()`, reset the log:
   ```ts
   clickLog = [];
   lastClickAt = Date.now();
   ```

5. Replace `handleClick()` to log each click:
   ```ts
   function handleClick(num: number) {
   	if (!started) return;
   	const reactionTimeMs = Date.now() - lastClickAt;
   	lastClickAt = Date.now();

   	if (targets.has(num)) {
   		clickLog.push({ number: num, isTarget: true, isCorrect: true, reactionTimeMs });
   		found = new Set([...found, num]);
   		if (found.size === targets.size) {
   			stopTimer();
   			started = false;
   			const trialRows: AttentionTrialRow[] = clickLog.map((c, i) => ({
   				clickIndex: i + 1,
   				number: c.number,
   				isTarget: c.isTarget,
   				isCorrect: c.isCorrect,
   				reactionTimeMs: c.reactionTimeMs,
   				totalTargets: targets.size,
   				totalNumbers: n
   			}));
   			sendResults(trialRows);
   			gameEnd();
   		}
   	} else {
   		clickLog.push({ number: num, isTarget: false, isCorrect: false, reactionTimeMs });
   		errors++;
   	}
   }
   ```

6. The `correctAnswers` counter is no longer needed for the DB row (derived from clickLog). But it's used in the UI display during the game. Keep `correctAnswers` or derive it from `found.size` / `clickLog` as appropriate. Actually, looking at the current code, there is no `correctAnswers` — the UI uses `found.size` and `targets.size` directly. So just remove the aggregate `AttentionResult` construction.

**Verify**: `npm run check` → exit 0

### Step 6: Create results-adapter.ts

Create `src/lib/exercises/attention/results-adapter.ts`:

```ts
import type { AttentionTrialRow } from './types';

export type { AttentionTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: AttentionTrialRow[]) {
	const totalClicks = trials.length;
	const foundCount = trials.filter((t) => t.isTarget && t.isCorrect).length;
	const errorCount = trials.filter((t) => !t.isCorrect).length;
	const totalTargets = trials.length > 0 ? trials[0].totalTargets : 0;
	const totalNumbers = trials.length > 0 ? trials[0].totalNumbers : 0;
	const accuracy = totalTargets ? foundCount / totalTargets : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalClicks
		? Math.round(totalDurationMs / totalClicks)
		: 0;

	return {
		totalClicks,
		foundCount,
		errorCount,
		totalTargets,
		totalNumbers,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs
	};
}
```

**Verify**: File saved.

### Step 7: Create ResultsChart.svelte

Create `src/lib/exercises/attention/ResultsChart.svelte`, following the emoji `ResultsChart.svelte` pattern:

- Chart type: `line`
- X axis: Click number (1-based `clickIndex`)
- Y axis: `reactionTimeMs`
- Point colors: green for target clicks (`isTarget && isCorrect`), red for error clicks (`!isCorrect`), gray for non-target clicks that happen to not be errors (shouldn't occur, but defensive)
- Dashed horizontal annotation line at average response time
- Custom legend: 3 items (average line, found target, error click)
- Tooltips:
  - Title: `Клик {x}`
  - AfterTitle: `Число: {number} — {isTarget ? 'Цель' : 'Не цель'}`
  - BeforeBody: `{isCorrect ? 'Найдено' : 'Ошибка'}`
  - Label: `Реакция: {formatMs(y)}`
- X-axis ticks colored green for found targets, red for errors
- Use `getCSSVar` from `$lib/utils` for colors

**Verify**: `npm run check` → exit 0

### Step 8: Update Result.svelte

Replace `src/lib/exercises/attention/Result.svelte` with the per-trial pattern:

```svelte
<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { AttentionTrialRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as AttentionTrialRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Найдено</span>
		<strong class="text-base sm:text-2xl">{s.foundCount}/{s.totalTargets}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Ошибки</span>
		<strong class="text-base sm:text-2xl">{s.errorCount}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.totalTargets ? Math.round(s.accuracy * 100) : 0}%</strong
		>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-center text-xs opacity-70 sm:mb-2 sm:text-sm">Среднее время</span
		>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
</div>

<ResultsChart clicks={rows} />
```

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

### Step 9: Reset dev DB and verify end-to-end

1. Delete the old SQLite file: `rm sqlite.db sqlite.db-shm sqlite.db-wal`
2. Run `npm run init-db-dev`
3. Run `npm run dev`, play an attention game, verify data saves and results render

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

## Test plan

- Manual testing:
  - Play an attention game with default settings (30 numbers, 5 targets)
  - Click a mix of target numbers and non-target numbers
  - Verify results page shows 4-cell summary (found/targets, errors, accuracy, avg time)
  - Verify chart renders with data points: green for found targets, red for errors
  - Verify tooltips show which number was clicked and whether it was a target
  - Change n and m to custom values and play again — verify totalTargets/totalNumbers reflect the new settings

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "AttentionResult" src/` returns no matches (only `AttentionTrialRow` remains)
- [ ] Per-click tracking is active (not just counter increments)
- [ ] No files outside the in-scope list are modified (`git diff --stat`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- The `handleClick` function has been fundamentally restructured in `AttentionGame.svelte`.

## Maintenance notes

- `totalTargets` and `totalNumbers` are stored on every trial row (session-level facts). If future schema normalization removes them, the adapter will need a separate session query.
- The attention game has configurable `n` and `m` values. These are now stored as `totalNumbers` and `totalTargets` on every row. If future versions change the game to have a fixed grid, these columns become constant but are still useful for historical data.
- Reaction time here is "time since last click", not "time since stimulus appeared". This measures sustained attention / search speed, not a single-stimulus response. The chart interpretation differs from flanker/emoji where reaction time is stimulus-response.
