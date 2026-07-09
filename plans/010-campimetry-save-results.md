# Plan 010: Save campimetry exercise results to DB + show results page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3fc4a4f..HEAD -- src/lib/exercises/campimetry/ src/lib/server/db/ src/lib/exercises/types.ts src/lib/exercises/index.ts src/routes/(app)/exercises/[slug]/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: Medium
- **Risk**: LOW
- **Depends on**: Plan 009 (DONE)
- **Category**: tech-debt
- **Planned at**: commit `3fc4a4f`, 2026-06-14

## Why this matters

Campimetry is one of four exercises that currently have no result persistence. When users finish the game, they see an inline chart but lose all data on page navigation. Adding result persistence lets users review past sessions, track their color-discrimination thresholds over time, and enables future trend analysis. This is the simplest of the four exercises because the test-side DB table (`campimetry_attempt`) already exists with the exact schema needed.

## Current state

### Campimetry exercise Playground

File: `src/lib/exercises/campimetry/Playground.svelte`

The exercise version of campimetry does NOT accept `gameEnd`/`sendResults` props. It manages its own game lifecycle:

```ts
let { data } = $props();
// ...
export function stopGame() {
    isGameRunning = false;
    console.log(game.getResults());
    results = game.getResults();
}
```

After the game ends, it renders the test-side ResultsChart inline:

```svelte
{:else}
    <ResultsChart testType="campimetry" results={results!}></ResultsChart>
{/if}
```

**Contrast with test version** (`src/lib/tests/campimetry/Playground.svelte`), which already uses the correct pattern:

```ts
let { data, gameEnd, sendResults } = $props();

export function stopGame() {
    isGameRunning = false;
    gameEnd();
    sendResults(game.getResults());
}
```

And after game end renders just `<h1>Тест окончен</h1>` instead of an inline chart.

### Result type

File: `src/lib/exercises/campimetry/types/index.ts`

```ts
type CampimetryCommon = {
    attempt: number;
    stage: number;
    silhouette: string;
    channel: 'a' | 'b';
    op: '+' | '-';
};

export interface CampimetryResult extends CampimetryCommon {
    color: string;
    delta: number;
    time: number;
}
```

All fields are primitives — maps cleanly to SQLite columns.

### Existing DB table for tests

File: `src/lib/server/db/models/tests.ts` (lines 19–43)

A `campimetryAttempt` table already exists there. The exercise needs its own table in `models/exercises.ts` with the same structure but referencing the exercise session table instead of the test session table. Alternatively, the existing table can be reused since it's registered under `'campimetry'` key in both `attemptTableMap` and `queryTableMap` in the controller — but this would conflate test and exercise sessions. A separate table is cleaner and matches the established pattern (every exercise has its own table).

### Game logic

File: `src/lib/exercises/campimetry/logic/campimetry-game.ts`

The game produces `CampimetryResult[]`. Each result represents one task-answer pair. There are typically ~20 results per game (10 colors × 2 stages). The `getResults()` method returns them all as a flat array.

### ResultsChart (test-side)

File: `src/lib/tests/campimetry/ResultsChart.svelte`

This is a Chart.js component that takes `{testType: 'campimetry', results: CampimetryResult[]}`. It calculates mood, shows a line chart of delta values, and displays aggregate time stats. For the exercise results page we'll use Variant B (embedded chart) like raven-matrices does, embedding this existing chart inside a new `Result.svelte`.

### Existing shared infrastructure

Files:
- `src/lib/server/db/controllers/result.ts` — already has `'campimetry': campimetryAttempt` mapping from tests; exercise must use a different key (`'campimetryExercise'`) or a differently-named table
- `src/lib/exercises/types.ts` — no campimetry entry yet
- `src/lib/exercises/index.ts` — has `playground` loader but no `result` loader
- Route handlers: see plan 009 for the exact pattern

### Conventions

Follow the established patterns from plans 001–007 (all DONE). Exemplar files:
- Numbers (simplest recent example): `src/lib/exercises/numbers/Playground.svelte`, `src/lib/exercises/numbers/Result.svelte`, `src/lib/exercises/numbers/types.ts`
- Card styling: always `bg-[#364b6c] p-4 rounded-2xl text-center text-white`
- Svelte 5 runes only: `$props()`, `$state`, `$derived`, `$effect` — no `createEventDispatcher`, no `$:`, no `export let`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Schema push | `npm run init-db-dev`   | exit 0              |
| Typecheck | `npm run check`          | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope**:
- `src/lib/server/db/models/exercises.ts` — add `campimetryExerciseAttempt` table
- `src/lib/server/db/controllers/result.ts` — register new table
- `src/lib/exercises/types.ts` — add campimetry type entries
- `src/lib/exercises/campimetry/types/index.ts` — export DB-safe type alias
- `src/lib/exercises/campimetry/Playground.svelte` — rewrite to use `gameEnd`/`sendResults` props, remove inline results display
- `src/lib/exercises/campimetry/Result.svelte` — create new file
- `src/lib/exercises/index.ts` — add `result` loader
- `src/routes/(app)/exercises/[slug]/playground/+server.ts` — add slug mapping + EXERCISES_WITH_RESULTS entry
- `src/routes/(app)/exercises/[slug]/results/+page.server.ts` — add slug→type mapping

**Out of scope**:
- `src/lib/server/db/models/tests.ts` — do NOT modify test tables
- `src/lib/tests/campimetry/` — test infrastructure stays untouched
- Any changes to the Chart.js chart or `ResultsChart.svelte` — it's reused as-is
- Changes to other exercises or shared page shells

## Git workflow

- Branch: `advisor/010-campimetry-save-results`
- Commit per step; message style: conventional commits (e.g., `feat(campimetry): add exercise result persistence`)
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add campimetryExerciseAttempt table to DB models

Add after the last table definition in `src/lib/server/db/models/exercises.ts`:

```ts
export const campimetryExerciseAttempt = sqliteTable('campimetry_exercise_attempt', {
    id: text('id').primaryKey().$defaultFn(generate),
    attempt: integer('attempt').default(1).notNull(),
    stage: integer('stage').notNull(),
    silhouette: text('silhouette').notNull(),
    channel: text('channel').notNull(),
    op: text('op').notNull(),
    color: text('color').notNull(),
    delta: integer('delta').notNull(),
    time: integer('time').notNull(),
    sessionId: text('session_id')
        .notNull()
        .references(() => session.id),
    createdAt: text('created_at')
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
});
```

Notes:
- Table name: `campimetry_exercise_attempt` (differentiated from the test table `campimetry_attempt`)
- No CHECK constraints needed here — the test table had them but the exercise version keeps things simple, matching all other exercise tables
- All fields mirror the test's `campimetryAttempt` except using exercise session reference

**Verify**: File saves without errors. `npx tsc --noEmit` should pass if available, otherwise continue to step 5 for combined typecheck.

### Step 2: Register in the result controller

In `src/lib/server/db/controllers/result.ts`:

1. Add import:
```ts
import { ..., campimetryExerciseAttempt } from '$lib/server/db/models/exercises';
```

2. Add to BOTH maps with key `'campimetryExercise'`:
```ts
const attemptTableMap = {
    // ...existing...
    campimetryExercise: campimetryExerciseAttempt
};

const queryTableMap = {
    // ...existing...
    campimetryExercise: db.query.campimetryExerciseAttempt
};
```

Use key `'campimetryExercise'` (NOT `'campimetry'`) because the test side already occupies the `'campimetry'` key.

**Verify**: No TypeScript errors in the file.

### Step 3: Extend TypeScript types

In `src/lib/exercises/types.ts`:

1. Import:
```ts
import type { CampimetryResult } from './campimetry/types';
```

2. Add to `ExerciseType` union:
```ts
| 'campimetryExercise'
```

3. Add to `ExerciseResultMap`:
```ts
campimetryExercise: CampimetryResult;
```

4. Add to `ExerciseResult` and `ExerciseResults` unions:
```ts
// In ExerciseResult:
| CampimetryResult

// In ExerciseResults:
| CampimetryResult[]
```

Note: We reuse `CampimetryResult` directly since its fields are all primitives and map cleanly to SQLite columns. Each completed game produces multiple rows (one per task), matching how the test stores them.

**Verify**: `npm run check` passes.

### Step 4: Update Playground.svelte to use gameEnd/sendResults props

Replace the entire content of `src/lib/exercises/campimetry/Playground.svelte` with:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { CampimetryGame } from './logic/campimetry-game';
	import { LabColor } from './logic/lab-color.svelte';
	import { error } from '@sveltejs/kit';
	import { shuffle } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		data,
		gameEnd,
		sendResults
	}: {
		data: any;
		gameEnd: () => void;
		sendResults: (results: any[]) => void;
	} = $props();

	let isGameRunning = $state(true);

	let game: CampimetryGame = $state(Object());
	let silhouettes: string[] = $state([]);

	let currentSilhouette = $state('swallow');
	let currentBackgroundColor: LabColor = $state(Object());
	let currentSilhouetteColor: LabColor = $state(Object());
	let currentChannel = $state('');
	let currentOp = $state('');

	let currentStage = $state(1);
	let delta = $state(0);

	onMount(async () => {
		resetGame();
	});

	function resetGame() {
		currentStage = 1;
		delta = 0;
		game = new CampimetryGame(Object.keys(data.silhouettes));
		isGameRunning = true;
		nextTask();
	}

	function updateState(
		s: string[],
		stage: number,
		silhouette: string,
		color: LabColor,
		channel: 'a' | 'b',
		op: '+' | '-'
	) {
		silhouettes = s;
		currentStage = stage;
		currentSilhouette = silhouette;
		if (stage != 2) {
			currentBackgroundColor = new LabColor(color);
			currentSilhouetteColor = new LabColor(color);
		}
		currentChannel = channel;
		currentOp = op;
	}

	function stopGame() {
		isGameRunning = false;
		sendResults(game.getResults());
		gameEnd();
	}

	function getSilhouetteChoices(num: number, correct: string): string[] {
		if (Object.keys(data.silhouettes).indexOf(correct) == -1) {
			error(500, 'Silhouette not in array');
		}
		let choices = Object.keys(data.silhouettes).filter((x) => x != correct);
		choices = choices.slice(0, num);
		choices.push(correct);
		shuffle(choices);
		return choices;
	}

	function nextTask() {
		if (!isGameRunning || game.isGameOver()) return stopGame();
		game.startNextTask();
		const currentTask = game.getCurrentTask();
		updateState(
			getSilhouetteChoices(2, currentTask.silhouette),
			currentTask.stage,
			currentTask.silhouette,
			currentTask.color,
			currentTask.channel,
			currentTask.op
		);
	}

	function handleAnswer() {
		if (!isGameRunning) return;

		game.handleAnswer(delta);
		if (currentStage == 1) {
			addRandomToDelta();
		}
		if (currentStage == 2) {
			delta = 0;
		}
		nextTask();
	}

	function addRandomToDelta() {
		const increment = Math.round(Math.random() * 5 + 4);
		delta += increment;
		if (currentChannel == 'a')
			for (let i = 0; i < increment; i++) {
				currentOp == '+' ? currentSilhouetteColor.incA() : currentSilhouetteColor.decA();
			}
		if (currentChannel == 'b')
			for (let i = 0; i < increment; i++) {
				currentOp == '+' ? currentSilhouetteColor.incB() : currentSilhouetteColor.decB();
			}
	}

	function changeColor() {
		if (delta > 0) {
			if (currentChannel == 'a')
				currentOp == '+' ? currentSilhouetteColor.incA() : currentSilhouetteColor.decA();
			if (currentChannel == 'b')
				currentOp == '+' ? currentSilhouetteColor.incB() : currentSilhouetteColor.decB();
		}
		if (currentStage == 1) delta++;
		if (currentStage == 2) delta--;
	}
</script>

{#if isGameRunning}
	<div class="background" style={`background-color: ${currentBackgroundColor.toString()}`}>
		<div
			class="max-xs:w-16 max-xs:h-16 h-32 w-32 mask-contain"
			style={`
                background-color: ${currentSilhouetteColor.toString()};
                mask-image: url(${data.silhouettes[currentSilhouette]});
                -webkit-mask-image: url(${data.silhouettes[currentSilhouette]});
            `}
		></div>
	</div>
	<div class="flex gap-2">
		<Button color="green" onclick={changeColor}
			>{currentStage == 1 ? 'Проявить фигуру' : 'Скрыть фигуру'}</Button
		>
		{#if currentStage == 2}
			<Button color="blue" onclick={handleAnswer}>Больше не видно</Button>
		{/if}
	</div>
	{#if currentStage == 1}
		<div class="row flex w-4/5 max-w-96 justify-between">
			{#each silhouettes as s}
				<button
					aria-label={`${s} button`}
					class="max-xs:w-16 max-xs:h-16 h-[100px] w-[100px] cursor-pointer touch-none bg-white mask-contain select-none"
					disabled={!delta}
					style={`
                        mask-image: url(${data.silhouettes[s]});
                        -webkit-mask-image: url(${data.silhouettes[s]});
                    `}
					onclick={() => {
						if (s == currentSilhouette) {
							handleAnswer();
						}
					}}
				></button>
			{/each}
		</div>
		<p class="text-center">
			Изменяйте оттенок, пока силуэт не станет различимым, а затем выберите правильный силуэт.
		</p>
	{:else}
		<p class="text-center">
			Изменяйте оттенок, пока силуэт не перестанет быть виден. Затем нажмите "Больше не видно".
		</p>
	{/if}
{:else}
	<h1>Тест окончен</h1>
{/if}

<style>
	.background {
		display: flex;
		justify-content: center;
		align-items: center;
		aspect-ratio: 1 / 1;
		margin: 10px 0;
	}

	@media (orientation: portrait) {
		.background {
			width: 70vw;
			height: 70vw;
		}
	}

	@media (orientation: landscape) {
		.background {
			width: 50vh;
			height: 50vh;
		}
	}
</style>
```

Key changes from original:
1. Added `gameEnd` and `sendResults` props
2. `stopGame()` now calls `sendResults(game.getResults())` then `gameEnd()` instead of storing results locally
3. Removed `showResults` state variable, `results` variable, and `ResultsChart` import/display
4. Replaced inline chart display with `<h1>Тест окончен</h1>` when game is not running
5. Removed console.log statements from `resetGame()` and `stopGame()`

**Verify**: File compiles without errors. The component signature now matches other exercises.

### Step 5: Create Result.svelte (Variant B — embedded chart)

Create new file `src/lib/exercises/campimetry/Result.svelte`:

```svelte
<script lang="ts">
	import type { CampimetryResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';
	import ResultsChart from '$lib/tests/campimetry/ResultsChart.svelte';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();

	const allTime = Math.round(
		results.reduce((a: number, b: any) => a + b.time, 0) / 1000
	);
	const avg = Math.round(
		(results.reduce((a: number, b: any) => a + b.time, 0) / results.length / 1000)
	);
</script>

<div class="flex flex-col items-center gap-2 py-2">
	<p>Время прохождения: {allTime} с</p>
	<p>Среднее время на один цвет: {avg} с</p>
</div>

<ResultsChart testType="campimetry" results={results as CampimetryResult[]} />
```

This follows Variant B (like raven-matrices) because campimetry has a dedicated Chart.js visualization component that provides significant diagnostic value.

**Verify**: File exists and imports resolve correctly.

### Step 6: Register the result loader

In `src/lib/exercises/index.ts`, update the campimetry entry in `exerciseLoaders`:

```ts
campimetry: {
    about: () => import('./campimetry/About.svelte'),
    playground: () => import('./campimetry/Playground.svelte'),
    result: () => import('./campimetry/Result.svelte') // NEW
},
```

**Verify**: `npm run check` passes.

### Step 7: Update route handlers

**File**: `src/routes/(app)/exercises/[slug]/playground/+server.ts`

1. Add slug mapping to `SLUG_TO_EXERCISE_TYPE`:
```ts
campimetry: 'campimetryExercise',
```

No special POST handling needed — campimetry produces a flat array of `CampimetryResult` objects where each becomes one DB row, which is exactly what `postResult()` does.

**File**: `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Add mapping to `slugToExerciseType`:
```ts
campimetry: 'campimetryExercise',
```

**Verify**: Both files save without errors.

### Step 8: Push schema changes and verify

```bash
npm run init-db-dev
```

Then verify the table exists:
```bash
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='campimetry_exercise_attempt';"
```

Run quality checks:
```bash
npm run check && npm run lint && npm run build
```

Manual E2E verification:
1. Navigate to `/exercises/campimetry/about`
2. Start a game, play through to completion
3. Verify: POST `/exercises/campimetry/playground` returns 201
4. Verify: page navigates to `/exercises/campimetry/results`
5. Verify: results page shows accordion entry with the chart and time stats
6. Play again → second accordion entry appears

## Test plan

No automated tests exist for this flow currently (per AGENTS.md: "tests are kinda useless right now"). Manual E2E verification above covers the critical path. If adding tests later, model after existing server-test patterns in `src/**/*.test.ts`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] Table `campimetry_exercise_attempt` exists in the dev database
- [ ] `grep -r "campimetryExercise" src/lib/exercises/types.ts` returns the added entry
- [ ] `grep -r "result.*campimetry.*Result" src/lib/exercises/index.ts` returns the loader
- [ ] No references to `showResults` remain in campimetry Playground
- [ ] No references to inline `ResultsChart` import in campimetry Playground (should only be in Result.svelte)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- You discover that `campimetryExerciseAttempt` already exists in `models/exercises.ts` (someone else already added it).
- You discover that the `ResultsChart` component's required props have changed significantly.

## Maintenance notes

- The `CampimetryResult` type is shared between exercise (`src/lib/exercises/campimetry/types/`) and test (`src/lib/tests/campimetry/types/`). They're identical but duplicated. A future refactor could extract to a shared location, but don't do that here.
- The ExerciseType key `'campimetryExercise'` differs from the URL slug `'campimetry'` — this mismatch is intentional and handled by the slug-to-type mappings in route handlers. Anyone adding campimetry-related features should be aware of this distinction.
- The Result.svelte reuses the test-side `ResultsChart.svelte` via cross-import (`$lib/tests/campimetry/ResultsChart.svelte`). If the chart is refactored, both test and exercise results pages will be affected.
