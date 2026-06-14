# Plan 013: Save word-morphing exercise results to DB + show results page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3fc4a4f..HEAD -- src/lib/exercises/word-morphing/ src/lib/server/db/ src/lib/exercises/types.ts src/lib/exercises/index.ts src/routes/(app)/exercises/[slug]/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: Medium-Large
- **Risk**: HIGH
- **Depends on**: Plan 009 (DONE)
- **Category**: tech-debt
- **Planned at**: commit `3fc4a4f`, 2026-06-14

## Why this matters

Word-morphing is the most complex of the four exercises without result persistence. Unlike campimetry/memory-match/nback, it has no centralized game class — all logic lives in one massive `Playground.svelte` (484 lines). It's a multi-phase exercise with a timer-based wait period that can span hours, push notifications, and localforage session persistence. Adding result persistence is important because this exercise tests long-term associative memory — users need to see how their recall accuracy trends over time.

The risk is HIGH because:
1. The Playground.svelte must be significantly restructured to separate game flow from the display of results
2. The existing Result component (`components/Result.svelte`) does comparison rendering but doesn't compute a scorable summary
3. There are two game modes (words vs. shapes/colors) which affect what metrics make sense

## Current state

### Playground.svelte

File: `src/lib/exercises/word-morphing/Playground.svelte` (484 lines)

This file is the entire game — there is NO separate Game component. All phases live here:
- `category-select` → choose words or shapes mode
- `time-select` → pick timer duration
- `initial` → show original combination
- `replace-adj` / `replace-noun` → modify parts of the combination
- `wait` → timer counts down (can be hours)
- `recall` → type back recalled combinations
- `result` → show recall accuracy via inline `Result` component

Key behaviors:
- Uses localforage to persist `WordMorphingSession` across page reloads during the wait phase
- Sets up web push notifications for when the wait timer expires
- Does NOT currently accept `gameEnd`/`sendResults` props — manages its own lifecycle entirely
- After the recall phase ends (`finishRecall()`), it calls `nextPhase()` → `phase = 'result'`
- Results are displayed inline by `<Result>` component

### Types

File: `src/lib/exercises/word-morphing/types/index.ts`

```ts
export type WordMorphingResult = {
    original: string;
    modifiedAdj: string;
    modifiedNoun: string;
    recalled: string[];
    timestamp: number;
};

export type WordMorphingSession = {
    timerEndsAt: number; // Unix timestamp in milliseconds
    expectedCombos: string[];
    category: 'words' | 'shapes';
};

export type Shape = {
    name: string;
    render: (color: string) => string;
};

export type Color = {
    name: string;
    value: string;
};
```

`WordMorphingResult` has `recalled: string[]` which is variable-length. We need a DB-safe summary.

### Inline Result component

File: `src/lib/exercises/word-morphing/components/Result.svelte`

Shows each recalled combo color-coded correct/incorrect, then lists expected combos or renders shape/color SVGs. Does NOT produce any numeric score.

### Design decisions

**DB-safe summary type:** Store per-game summary as a single row:

| Field | Type | Description |
|-------|------|-------------|
| category | text | `'words'` or `'shapes'` |
| totalCombos | integer | Always 3 |
| correctCount | integer | How many of the 3 combos were recalled correctly |
| durationSeconds | integer | Wait time selected (seconds) — proxy for difficulty |

This uses Approach A (exclude complex fields). The `recalled[]` array and specific word comparisons aren't stored; only the aggregate score matters for trend analysis. The detailed comparison rendering requires the original/modified/recalled strings which can't be meaningfully queried anyway.

**Accuracy calculation:** A recalled combo matches if it equals the expected combo after lowercasing and ё→е normalization (matching the existing `isCorrectCombination` logic in `components/Result.svelte`).

**Architecture approach:** Since the Playground IS the game (no separate Game component), we add `gameEnd`/`sendResults` props to Playground itself. When the result phase would begin, we instead send results + call gameEnd. The route page then redirects to the results page.

However, there's a complication: the current "result" phase shows a rich visual comparison that can't be reproduced from the flat DB row alone. For MVP, the Result.svelte will show simple stat cards (correct count, accuracy %). Future work could store `expectedCombos[]` and `recalled[]` as JSON text columns if drill-down is needed.

**Wait period handling:** The wait period (which can last minutes/hours) means the game isn't "over" until the recall phase completes. The `gameEnd`/`sendResults` should fire at the end of the recall phase, not before. No change needed for the wait/localforage/push notification logic.

### Conventions

Follow established patterns from plans 001–007. Exemplar files:
- Numbers (simple): `src/lib/exercises/numbers/Playground.svelte`, `src/lib/exercises/numbers/Result.svelte`
- Card styling: `bg-[#364b6c] p-4 rounded-2xl text-center text-white`
- Svelte 5 runes only: `$props()`, `$state`, `$derived`, `$effect`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Schema push | `npm run init-db-dev`   | exit 0              |
| Typecheck | `npm run check`          | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope**:
- `src/lib/server/db/models/exercises.ts` — add `wordMorphingExerciseAttempt` table
- `src/lib/server/db/controllers/result.ts` — register new table
- `src/lib/exercises/types.ts` — add word-morphing type entries
- `src/lib/exercises/word-morphing/types/index.ts` — add DB-safe summary export type
- `src/lib/exercises/word-morphing/Playground.svelte` — add `gameEnd`/`sendResults` props, replace result phase with send+redirect
- `src/lib/exercises/word-morphing/Result.svelte` — create NEW file at exercise root level (not inside components/)
- `src/lib/exercises/index.ts` — add `result` loader
- `src/routes/(app)/exercises/[slug]/playground/+server.ts` — add slug mapping
- `src/routes/(app)/exercises/[slug]/results/+page.server.ts` — add slug→type mapping

**Out of scope**:
- `src/lib/exercises/word-morphing/components/Result.svelte` — leave as-is; may still be used internally during game but NOT by the results page
- Localforage/push notification logic changes — those handle the wait period and stay untouched
- Any changes to other exercises or shared page shells
- No new game component extraction (too large a refactor for this plan)

## Git workflow

- Branch: `advisor/013-word-morphing-save-results`
- Commit per step; message style: conventional commits
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add DB-safe summary type

In `src/lib/exercises/word-morphing/types/index.ts`, add at the bottom:

```ts
export type WordMorphingSummaryRow = {
    category: string;
    totalCombos: number;
    correctCount: number;
    durationSeconds: number;
};
```

Note: Using `string` instead of `'words' | 'shapes'` for SQLite compatibility (stored as text).

**Verify**: File saves without errors.

### Step 2: Add wordMorphingExerciseAttempt table to DB models

Add after the last table definition in `src/lib/server/db/models/exercises.ts`:

```ts
export const wordMorphingExerciseAttempt = sqliteTable('word_morphing_exercise_attempt', {
    id: text('id').primaryKey().$defaultFn(generate),
    attempt: integer('attempt').default(1).notNull(),
    category: text('category').notNull(),
    totalCombos: integer('total_combos').notNull(),
    correctCount: integer('correct_count').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    sessionId: text('session_id')
        .notNull()
        .references(() => session.id),
    createdAt: text('created_at')
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
});
```

Notes:
- One row per completed game session (after recall phase)
- `totalCombos`: always 3 (original, adj-replaced, both-replaced)
- `correctCount`: 0–3 depending on recall accuracy
- `durationSeconds`: the wait time the user selected (30s, 600s, 3600s, custom) — acts as difficulty indicator

**Verify**: File saves without errors.

### Step 3: Register in the result controller

In `src/lib/server/db/controllers/result.ts`:

1. Add import:
```ts
import { ..., wordMorphingExerciseAttempt } from '$lib/server/db/models/exercises';
```

2. Add to BOTH maps with key `'wordMorphingExercise'`:
```ts
const attemptTableMap = {
    // ...existing...
    wordMorphingExercise: wordMorphingExerciseAttempt
};

const queryTableMap = {
    // ...existing...
    wordMorphingExercise: db.query.wordMorphingExerciseAttempt
};
```

**Verify**: No TypeScript errors.

### Step 4: Extend TypeScript types

In `src/lib/exercises/types.ts`:

1. Import:
```ts
import type { WordMorphingSummaryRow } from './word-morphing/types';
```

2. Add to `ExerciseType` union:
```ts
| 'wordMorphingExercise'
```

3. Add to `ExerciseResultMap`:
```ts
wordMorphingExercise: WordMorphingSummaryRow;
```

4. Add to `ExerciseResult` and `ExerciseResults` unions:
```ts
// In ExerciseResult:
| WordMorphingSummaryRow

// In ExerciseResults:
| WordMorphingSummaryRow[]
```

**Verify**: `npm run check` passes.

### Step 5: Modify Playground.svelte to use gameEnd/sendResults props

This is the most complex step. Modify `src/lib/exercises/word-morphing/Playground.svelte`.

#### 5a: Add props destructuring

Change:
```ts
let { data } = $props();
```

To:
```ts
let {
    data,
    gameEnd,
    sendResults
}: {
    data: any;
    gameEnd: () => void;
    sendResults: (results: any[]) => void;
} = $props();
```

Also import the summary type:
```ts
import type { WordMorphingSummaryRow } from './types';
```

#### 5b: Replace result phase transition with sendResults

Currently, `finishRecall()` stores recalled combos and transitions to result phase:
```ts
async function finishRecall() {
    setRecalledCombos();
    try {
        await localforage.removeItem('wordMorphingSession');
        timerEndsAt = null;
    } catch (error) {
        console.error('Error clearing session:', error);
    }
    nextPhase(); // → sets phase = 'result'
}
```

Replace with:
```ts
async function finishRecall() {
    setRecalledCombos();

    let correctCount = 0;
    for (let i = 0; i < expectedCombos.length; i++) {
        const recalled = recalledCombos[i] || '';
        const expected = expectedCombos[i];
        if (
            recalled.toLocaleLowerCase().replace('ё', 'е') ===
            expected.toLocaleLowerCase().replace('ё', 'е')
        ) {
            correctCount++;
        }
    }

    const waitTime =
        selectedTimeOption.name === 'Пользовательский'
            ? customTimeInSeconds
            : selectedTimeOption.seconds;

    const summaryRow: WordMorphingSummaryRow = {
        category,
        totalCombos: expectedCombos.length,
        correctCount,
        durationSeconds: waitTime
    };

    sendResults([summaryRow]);
    gameEnd();

    try {
        await localforage.removeItem('wordMorphingSession');
        timerEndsAt = null;
    } catch (error) {
        console.error('Error clearing session:', error);
    }
}
```

#### 5c: Remove the inline result phase rendering

Remove the `{:else if phase === 'result'}` block from the template. After calling `sendResults()` + `gameEnd()`, the route page handles redirect, so no post-game UI is needed in this component.

Keep all other phases (`category-select`, `time-select`, `initial`, `replace-adj`, `replace-noun`, `wait`, `recall`) unchanged.

#### 5d: Remove unused imports if needed

After removing the result phase, `Result` from `./components/Result.svelte` is no longer used in this file. Remove its import.

**Verify**: `npm run check` passes. All phases except `result` still function correctly.

### Step 6: Create Result.svelte (Variant A — stat cards)

Create NEW file `src/lib/exercises/word-morphing/Result.svelte` (at the exercise root, NOT inside components/):

```svelte
<script lang="ts">
	import type { WordMorphingSummaryRow } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();

	function accuracyLabel(row: WordMorphingSummaryRow): string {
		if (row.totalCombos === 0) return '—';
		return Math.round((row.correctCount / row.totalCombos) * 100) + '%';
	}
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as WordMorphingSummaryRow}
	<div class="grid grid-cols-2 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Верно</span>
			<strong class="text-2xl">{attempt.correctCount} / {attempt.totalCombos}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Точность</span>
			<strong class="text-2xl">{accuracyLabel(attempt)}</strong>
		</div>
	</div>
	<div class="grid grid-cols-2 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Категория</span>
			<strong class="text-2xl">{attempt.category === 'words' ? 'Слова' : 'Фигуры'}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Интервал</span>
			<strong class="text-2xl"
				>{attempt.durationSeconds >= 60
					? attempt.durationSeconds >= 3600
						? (attempt.durationSeconds / 3600).toFixed(0) + ' ч'
						: (attempt.durationSeconds / 60).toFixed(0) + ' мин'
					: attempt.durationSeconds + ' с'}</strong
			>
		</div>
	</div>
{/each}
```

Notes:
- Two rows of 2 cards: primary metrics (correct count, accuracy%) and context (category, interval)
- Duration formatted as seconds/minutes/hours based on magnitude
- Category label localized ('Слова' / 'Фигуры')

**Verify**: File exists and imports resolve.

### Step 7: Register the result loader

In `src/lib/exercises/index.ts`, update the word-morphing entry in `exerciseLoaders`:

```ts
'word-morphing': {
    about: () => import('./word-morphing/About.svelte'),
    playground: () => import('./word-morphing/Playground.svelte'),
    result: () => import('./word-morphing/Result.svelte') // NEW
},
```

**Verify**: `npm run check` passes.

### Step 8: Update route handlers

**File**: `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Add slug mapping to `SLUG_TO_EXERCISE_TYPE`:
```ts
'word-morphing': 'wordMorphingExercise',
```

**File**: `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Add mapping to `slugToExerciseType`:
```ts
'word-morphing': 'wordMorphingExercise',
```

**Verify**: Both files save without errors.

### Step 9: Push schema changes and verify

```bash
npm run init-db-dev
```

Then verify:
```bash
npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='word_morphing_exercise_attempt';"
```

Run quality checks:
```bash
npm run check && npm run lint && npm run build
```

Manual E2E verification:
1. Navigate to `/exercises/word-morphing/about`
2. Choose a category, select quick timer (30 sec), play through to recall
3. Enter answers, complete recall
4. Verify: POST `/exercises/word-morphing/playground` returns 201
5. Verify: page navigates to `/exercises/word-morphing/results`
6. Verify: results page shows accordion entry with stat cards (correct count, accuracy%, category, interval)
7. Play again with different settings → second accordion entry appears

## Test plan

No automated tests exist for this flow currently. Manual E2E verification above covers the critical path. Pay special attention to:

- Words mode: ensure lowercase + ё→е normalization works for correctCount calculation
- Shapes mode: same scoring logic applies
- Timer interruption: resume an ongoing session (localforage) → complete recall → verify save works
- Custom timer duration stored correctly

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] Table `word_morphing_exercise_attempt` exists in the dev database
- [ ] `grep -r "phase === 'result'" src/lib/exercises/word-morphing/Playground.svelte` returns NO matches (inline result phase removed)
- [ ] `grep -r "gameEnd\|sendResults" src/lib/exercises/word-morphing/Playground.svelte` DOES return matches (props added)
- [ ] New `src/lib/exercises/word-morphing/Result.svelte` exists
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- You discover that `wordMorphingExerciseAttempt` already exists in `models/exercises.ts`.
- You discover that `Playground.svelte` has been significantly restructured (the multi-phase system is gone or phases renamed).
- The localforage/push notification integration breaks during testing — investigate before continuing, as this affects offline functionality.

## Maintenance notes

- The ExerciseType key `'wordMorphingExercise'` differs from URL slug `'word-morphing'` — handled by slug-to-type mappings.
- The existing `components/Result.svelte` is still on disk but no longer rendered from the Playground. It can be removed once confirmed unused elsewhere, but do NOT delete it in this plan.
- Accuracy calculation uses the same ё→е normalization as the original `isCorrectCombination`. If the normalization logic changes, update both places.
- The `durationSeconds` field represents the *selected* wait time, not actual elapsed time. If precise timing is needed later, add an `actualElapsedMs` column.
- The localforage session persistence for the wait period is unchanged. Users who start a long-timer session, close the browser, and return can still complete the recall phase — the sendResults/gameEnd call happens at the end regardless.
