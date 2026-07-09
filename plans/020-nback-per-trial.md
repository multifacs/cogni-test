# Plan 020: Migrate nback-stream exercise from per-session to per-trial DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7a66a00..HEAD -- src/lib/exercises/nback-stream/ src/lib/server/db/models/exercises.ts src/lib/server/db/controllers/result.ts src/lib/exercises/types.ts`
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

The nback-stream exercise collects rich per-click data in `clicks: ClickEvent[]` (stimulus index, answer yes/no, truth, isCorrect, reaction time ms, inter-click interval) — but then **discards it all** and sends only a single `NBackSummaryRow` aggregate to the DB. The `ResultsChart.svelte` component already accepts `ClickEvent[]` for rendering, but since the DB never stores per-click data, the chart can never be populated from real saved results. The existing `results-adapter.ts` even has a `toDbAttempts()` function that maps clicks to DB-shaped rows — but it's never called. Migrating to per-trial rows preserves the granular data and makes the chart actually functional.

## Current state

- `src/lib/exercises/nback-stream/types.ts` — defines `ClickEvent` (per-click, rich), `FullResult` (aggregate + clicks array), `NBackSummaryRow` (aggregate-only, sent to DB)
- `src/lib/exercises/nback-stream/NBackStreamGame.svelte` — game component; collects `clicks: ClickEvent[]`, computes `FullResult` with `clicks` array, then discards it and sends `[NBackSummaryRow]`
- `src/lib/exercises/nback-stream/Playground.svelte` — thin wrapper
- `src/lib/exercises/nback-stream/Result.svelte` — iterates aggregate rows, shows 6 stat cards per row (no chart)
- `src/lib/exercises/nback-stream/ResultsChart.svelte` — SVG chart accepting `ClickEvent[]`; never rendered from DB data because DB only stores aggregate
- `src/lib/exercises/nback-stream/results-adapter.ts` — has `toDbAttempts()` (unused!) and `summary()` functions
- `src/lib/server/db/models/exercises.ts` — `nbackExerciseAttempt` table with aggregate columns only
- `src/lib/server/db/controllers/result.ts` — maps `nbackExercise` type
- `src/lib/exercises/types.ts` — `NBackSummaryRow` used in `ExerciseResultMap`, `ExerciseResult`, `ExerciseResults`

### Current `ClickEvent` type (`src/lib/exercises/nback-stream/types.ts:11-22`):
```ts
export type ClickEvent = {
	ts: number;
	stimIndex: number;
	domain: Domain;
	nBack: 1 | 2 | 3;
	target: TargetFeature;
	answer: 'yes' | 'no';
	truth: boolean;
	isCorrect: boolean;
	rtMs: number;
	interClickMs: number;
};
```

### Current `NBackSummaryRow` type (`src/lib/exercises/nback-stream/types.ts:40-50`):
```ts
export type NBackSummaryRow = {
	domain: string;
	nBack: number;
	target: string;
	durationMs: number;
	totalStimuli: number;
	correct: number;
	incorrect: number;
	accuracy: number;
	avgRtMs: number;
};
```

### Current DB table (`src/lib/server/db/models/exercises.ts:159-177`):
```ts
export const nbackExerciseAttempt = sqliteTable('nback_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	domain: text('domain').notNull(),
	nBack: integer('n_back').notNull(),
	target: text('target').notNull(),
	durationMs: integer('duration_ms').notNull(),
	totalStimuli: integer('total_stimuli').notNull(),
	correct: integer('correct').notNull(),
	incorrect: integer('incorrect').notNull(),
	accuracy: integer('accuracy').notNull(),
	avgRtMs: integer('avg_rt_ms').notNull(),
	sessionId: text('session_id').notNull().references(() => session.id),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Current `finish()` in NBackStreamGame.svelte (`NBackStreamGame.svelte:124-162`):
```ts
function finish() {
	if (phase === 'done') return;
	clearInterval(tickTimer);
	phase = 'done';
	const totalStimuli = seq.length;
	const correct = clicks.filter((c) => c.isCorrect).length;
	const incorrect = clicks.length - correct;
	const avgRt = clicks.length
		? Math.round(clicks.reduce((a, c) => a + c.rtMs, 0) / clicks.length)
		: null;
	const res: FullResult = {
		domain,
		nBack,
		target: domain === 'numbers' ? 'number' : target,
		durationMs: Math.min(DURATION_MS, Date.now() - startAt),
		clicks,
		totalStimuli,
		summary: {
			correct,
			incorrect,
			accuracy: clicks.length ? +(correct / clicks.length).toFixed(3) : 0,
			avgRtMs: avgRt,
			misses: 0
		}
	};
	const summaryRow: NBackSummaryRow = {
		domain: res.domain,
		nBack: res.nBack,
		target: res.target,
		durationMs: res.durationMs,
		totalStimuli: res.totalStimuli,
		correct: res.summary.correct,
		incorrect: res.summary.incorrect,
		accuracy: Math.round(res.summary.accuracy * 1000),
		avgRtMs: res.summary.avgRtMs ?? 0
	};
	sendResults([summaryRow]);
	gameEnd();
}
```

### Current results-adapter.ts (`src/lib/exercises/nback-stream/results-adapter.ts`):
```ts
import type { FullResult } from "./types";

export function toDbAttempts(r: FullResult) {
  return r.clicks.map((c, i) => ({
    attempt: i + 1,
    time: c.rtMs,
    stage: r.nBack,
    cards: 0,
    flips: 0,
    mistakes: c.isCorrect ? 0 : 1,
    efficiency: c.rtMs,
    isCorrect: c.isCorrect,
    domain: r.domain,
    target: r.target,
    interClickMs: c.interClickMs,
    stimIndex: c.stimIndex
  }));
}

export function summary(r: FullResult) {
  const correct = r.clicks.filter(c => c.isCorrect).length;
  const incorrect = r.clicks.length - correct;
  const avgRt = r.clicks.length ? Math.round(r.clicks.reduce((a,c)=>a+c.rtMs,0)/r.clicks.length) : null;
  return { correct, incorrect, accuracy: r.clicks.length ? +(correct/r.clicks.length).toFixed(3) : 0, avgRtMs: avgRt };
}
```

Note: `toDbAttempts()` maps to a legacy shape with `cards`, `flips`, `efficiency` columns that don't match any real table. It appears to be a leftover from copying the memory-match adapter. It is **never called** anywhere.

### Current ResultsChart.svelte (`src/lib/exercises/nback-stream/ResultsChart.svelte`):
A raw SVG chart (NOT Chart.js). Uses Svelte 4 `export let` syntax. Accepts `ClickEvent[]` and renders:
- SVG line path connecting RT points
- Green/red circles per click (correct/error)
- Dashed average line with label
- Axes with labels

### Current Result.svelte:
Iterates aggregate rows as `NBackSummaryRow`, shows 6 stat cards in two rows. Does NOT render the `ResultsChart` because there's no per-click data in the DB.

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
- `src/lib/exercises/nback-stream/types.ts`
- `src/lib/exercises/nback-stream/NBackStreamGame.svelte`
- `src/lib/exercises/nback-stream/Result.svelte`
- `src/lib/exercises/nback-stream/ResultsChart.svelte`
- `src/lib/exercises/nback-stream/results-adapter.ts`
- `src/lib/server/db/models/exercises.ts`
- `src/lib/server/db/controllers/result.ts`
- `src/lib/exercises/types.ts`

**Out of scope** (do NOT touch):
- `src/lib/exercises/nback-stream/About.svelte`
- `src/lib/exercises/nback-stream/Playground.svelte` — already passes `sendResults` through
- `src/lib/exercises/nback-stream/StreamBoard.svelte`
- `src/lib/exercises/nback-stream/logic/` — generator logic, not data flow
- `src/lib/exercises/nback-stream/index.ts`
- `src/lib/exercises/nback-stream/+page.server.ts` and `+page.svelte` — route files, not exercise files
- Any other exercise's files

## Steps

### Step 1: Define new per-trial type

In `src/lib/exercises/nback-stream/types.ts`, add `NBackTrialRow` after the existing types (keep `ClickEvent`, `FullResult`, `Stimulus` etc. for game-internal use; remove `NBackSummaryRow`):

```ts
export type NBackTrialRow = {
	clickIndex: number;
	stimIndex: number;
	answer: string;
	truth: boolean;
	isCorrect: boolean;
	rtMs: number;
	interClickMs: number;
	domain: string;
	nBack: number;
	target: string;
	durationMs: number;
	totalStimuli: number;
};
```

Note: `domain`, `nBack`, `target`, `durationMs`, `totalStimuli` are session-level facts stored on every row so the adapter can derive them without a separate session query. `answer` is `'yes'` or `'no'`.

Remove `NBackSummaryRow` since it will no longer be used.

**Verify**: File saved.

### Step 2: Replace DB table schema

In `src/lib/server/db/models/exercises.ts`, replace the `nbackExerciseAttempt` table definition with:

```ts
export const nbackExerciseAttempt = sqliteTable('nback_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	clickIndex: integer('click_index').notNull(),
	stimIndex: integer('stim_index').notNull(),
	answer: text('answer').notNull(),
	truth: integer('truth', { mode: 'boolean' }).notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	rtMs: integer('rt_ms').notNull(),
	interClickMs: integer('inter_click_ms').notNull(),
	domain: text('domain').notNull(),
	nBack: integer('n_back').notNull(),
	target: text('target').notNull(),
	durationMs: integer('duration_ms').notNull(),
	totalStimuli: integer('total_stimuli').notNull(),
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
nbackExercise: (f) => asc(f.attempt),
```
to:
```ts
nbackExercise: (f) => asc(f.clickIndex),
```

**Verify**: File saved.

### Step 4: Update central types

In `src/lib/exercises/types.ts`:

Change the import from:
```ts
import type { NBackSummaryRow } from './nback-stream/types';
```
to:
```ts
import type { NBackTrialRow } from './nback-stream/types';
```

Update `ExerciseResultMap`:
```ts
nbackExercise: NBackTrialRow;
```

Update `ExerciseResult` union — replace `NBackSummaryRow` with `NBackTrialRow`.

Update `ExerciseResults` union — replace `NBackSummaryRow[]` with `NBackTrialRow[]`.

**Verify**: `npm run check` — may still fail on game component and results files.

### Step 5: Update NBackStreamGame.svelte to send per-trial rows

In `src/lib/exercises/nback-stream/NBackStreamGame.svelte`:

1. Change the import from `NBackSummaryRow` to `NBackTrialRow` (update the type import). Remove the `FullResult` import if it's no longer used.

2. Update the `sendResults` prop type from `NBackSummaryRow[]` to `NBackTrialRow[]`.

3. Replace `finish()` to send per-trial rows from `clicks`:

```ts
function finish() {
	if (phase === 'done') return;
	clearInterval(tickTimer);
	phase = 'done';
	const totalStimuli = seq.length;
	const actualDurationMs = Math.min(DURATION_MS, Date.now() - startAt);
	const actualTarget = domain === 'numbers' ? 'number' : target;

	const trialRows: NBackTrialRow[] = clicks.map((c, i) => ({
		clickIndex: i + 1,
		stimIndex: c.stimIndex,
		answer: c.answer,
		truth: c.truth,
		isCorrect: c.isCorrect,
		rtMs: c.rtMs,
		interClickMs: c.interClickMs,
		domain,
		nBack,
		target: actualTarget,
		durationMs: actualDurationMs,
		totalStimuli
	}));

	sendResults(trialRows);
	gameEnd();
}
```

4. Remove the `FullResult` construction and `NBackSummaryRow` construction code.

**Verify**: `npm run check` → exit 0

### Step 6: Rewrite results-adapter.ts

Replace `src/lib/exercises/nback-stream/results-adapter.ts` entirely. The old version uses `FullResult` (game-time type) and has the unused `toDbAttempts()`. The new version works with `NBackTrialRow[]` (DB row type):

```ts
import type { NBackTrialRow } from './types';

export type { NBackTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: NBackTrialRow[]) {
	const totalClicks = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const incorrectCount = totalClicks - correctCount;
	const accuracy = totalClicks ? correctCount / totalClicks : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.rtMs, 0);
	const averageResponseTimeMs = totalClicks ? Math.round(totalDurationMs / totalClicks) : 0;

	const domain = trials.length > 0 ? trials[0].domain : 'figures';
	const nBack = trials.length > 0 ? trials[0].nBack : 1;
	const target = trials.length > 0 ? trials[0].target : 'shape';
	const durationMs = trials.length > 0 ? trials[0].durationMs : 0;
	const totalStimuli = trials.length > 0 ? trials[0].totalStimuli : 0;

	return {
		totalClicks,
		correctCount,
		incorrectCount,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		domain,
		nBack,
		target,
		durationMs,
		totalStimuli
	};
}

export function domainLabel(domain: string): string {
	return domain === 'figures' ? 'Фигуры' : 'Числа';
}

export function targetLabel(target: string): string {
	switch (target) {
		case 'shape': return 'Форма';
		case 'color': return 'Цвет';
		case 'number': return 'Число';
		default: return target;
	}
}
```

**Verify**: File saved.

### Step 7: Update ResultsChart.svelte to use Chart.js + NBackTrialRow

Replace the current raw SVG `ResultsChart.svelte` with a Chart.js implementation following the emoji `ResultsChart.svelte` pattern (`src/lib/exercises/emoji/ResultsChart.svelte`). The current SVG chart uses Svelte 4 `export let` syntax and accepts `ClickEvent[]` — change to Svelte 5 `$props()` and accept `NBackTrialRow[]`:

```svelte
<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';
	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import { formatMs, summary, domainLabel, targetLabel, type NBackTrialRow } from './results-adapter';

	type NBackResult = {
		x: number;
		y: number;
		answer: string;
		truth: boolean;
		isCorrect: boolean;
		raw: NBackTrialRow;
	};

	let { trials }: { trials: NBackTrialRow[] } = $props();

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as NBackResult | undefined;
		if (!result) return 'white';
		return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());
	let avg = $state(0);

	function getResults(trials: NBackTrialRow[]): NBackResult[] {
		return trials.map((t, i) => ({
			x: i + 1,
			y: t.rtMs,
			answer: t.answer,
			truth: t.truth,
			isCorrect: t.isCorrect,
			raw: t
		}));
	}

	onMount(() => {
		const parsed = getResults(trials);
		const s = summary(trials);
		avg = s.averageResponseTimeMs;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsed.map((r) => r.x),
				datasets: [
					{
						label: 'Время реакции',
						data: parsed,
						borderWidth: 1,
						pointBackgroundColor: pointColor,
						pointRadius: 5,
						tension: 0.4
					}
				]
			},
			options: {
				onHover(event, chartElements) {
					const target = event.native ? event.native.target : event.chart.canvas;
					target.style.cursor = chartElements.length ? 'pointer' : 'default';
				},
				responsive: true,
				plugins: {
					tooltip: {
						callbacks: {
							title(context) {
								const value = context[0].raw as NBackResult;
								return `Ответ ${value.x}`;
							},
							afterTitle(context) {
								const value = context[0].raw as NBackResult;
								return `${domainLabel(s.domain)} / ${s.nBack}-back / ${targetLabel(s.target)}`;
							},
							beforeBody(context) {
								const value = context[0].raw as NBackResult;
								return [`Выбор: ${value.answer === 'yes' ? 'Да' : 'Нет'}`];
							},
							label(context) {
								const value = context.raw as NBackResult;
								const status = value.isCorrect ? 'Верно' : 'Ошибка';
								return `Реакция: ${formatMs(value.y)} (${status})`;
							}
						}
					},
					legend: {
						labels: {
							usePointStyle: true,
							generateLabels(chart) {
								const original =
									Chart.defaults.plugins.legend.labels.generateLabels(chart);
								const fontColor = original[0]?.['fontColor'] ?? 'white';
								const strokeStyle = original[0]?.['strokeStyle'] ?? 'white';
								return [
									{
										text: 'Среднее время реакции',
										fontColor,
										fillStyle: 'rgba(255,99,132,0.4)',
										strokeStyle: 'rgba(255,99,132,1)',
										pointStyle: 'line',
										lineDash: [6, 6],
										hidden: false,
										index: -1
									},
									{
										text: 'Верно',
										fontColor,
										fillStyle: getCSSVar('--color-green-500'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -2
									},
									{
										text: 'Ошибка',
										fontColor,
										fillStyle: getCSSVar('--color-red-400'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -3
									}
								];
							}
						}
					},
					annotation: {
						annotations: {
							averageLine: {
								type: 'line',
								yMin: avg,
								yMax: avg,
								borderColor: 'rgba(255,99,132,1)',
								borderWidth: 2,
								borderDash: [6, 6]
							}
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Ответ'
						},
						ticks: {
							color: (ctx) => {
								const r = parsed[ctx.index];
								if (!r) return 'white';
								const color = r.isCorrect ? '--color-green-500' : '--color-red-400';
								return getCSSVar(color);
							},
							font: {
								weight: 'bold'
							}
						}
					},
					y: {
						title: {
							display: true,
							text: 'Время реакции (мс)'
						}
					}
				}
			}
		});
	});

	onDestroy(() => {
		chart?.destroy?.();
	});
</script>

<div class="grid gap-2 w-full sm:w-4/5">
	<canvas bind:this={canvas}></canvas>
</div>
```

**Verify**: `npm run check` → exit 0

### Step 8: Update Result.svelte

Replace `src/lib/exercises/nback-stream/Result.svelte` with the per-trial pattern:

```svelte
<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { NBackTrialRow } from './types';
	import { formatMs, summary, domainLabel, targetLabel } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as NBackTrialRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Верно</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalClicks}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.totalClicks ? Math.round(s.accuracy * 100) : 0}%</strong
		>
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
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">{s.nBack}-back</span>
		<strong class="text-base sm:text-2xl">{domainLabel(s.domain)}</strong>
	</div>
</div>

<ResultsChart trials={rows} />
```

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

### Step 9: Reset dev DB and verify end-to-end

1. Delete the old SQLite file: `rm sqlite.db sqlite.db-shm sqlite.db-wal`
2. Run `npm run init-db-dev`
3. Run `npm run dev`, play an nback game, verify data saves and results render with chart

**Verify**: `npm run check` → exit 0, `npm run lint` → exit 0

## Test plan

- Manual testing:
  - Play a 1-back figures game (default settings)
  - Verify results page shows 4-cell summary (correct/total, accuracy, avg time, mode)
  - Verify chart renders with data points: green for correct, red for errors
  - Verify tooltips show answer choice, truth, and correctness
  - Play a 2-back numbers game — verify domain/target display correctly
  - Play a game that runs the full 60s — verify durationMs is correct

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "NBackSummaryRow" src/` returns no matches (only `NBackTrialRow` remains)
- [ ] `grep -rn "toDbAttempts" src/` returns no matches (dead code removed)
- [ ] ResultsChart.svelte uses Chart.js (not raw SVG) and Svelte 5 `$props()` (not `export let`)
- [ ] No files outside the in-scope list are modified (`git diff --stat`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- The `ClickEvent` type or `clicks` variable has been removed from `NBackStreamGame.svelte`.

## Maintenance notes

- `domain`, `nBack`, `target`, `durationMs`, `totalStimuli` are stored on every trial row (session-level facts). If future schema normalization removes them, the adapter will need a separate session query.
- The `accuracy` column in the old schema was stored as integer × 1000 (e.g. 750 = 75.0%). The new schema doesn't store accuracy at all — it's derived at read time.
- The old `ResultsChart.svelte` used raw SVG. The new one uses Chart.js, consistent with emoji and raven-matrices. This is a visual change but functionally equivalent.
- The `interClickMs` field (time between consecutive clicks) is stored but not currently displayed in the chart. It's available for future analysis of response patterns.
