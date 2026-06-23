Analysis

The Problem: Mismatched Architecture
The core issue is that **`wordMorphingExerciseAttempt` stores a summary row only**, not per-combo details:

```ts
// src/lib/server/db/models/exercises.ts:177-190
wordMorphingExerciseAttempt = sqliteTable('word_morphing_exercise_attempt', {
    attempt: integer('attempt').default(1).notNull(),
    category: text('category').notNull(),
    totalCombos: integer('total_combos').notNull(),
    correctCount: integer('correct_count').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    ...
});
```

This is used by:

- **`Playground.svelte:360-365`** — sends a single `WordMorphingSummaryRow` per session via `sendResults([summaryRow])`
- **`src/routes/(app)/exercises/[slug]/results/+page.svelte`** — the generic results page that lists sessions, passes `result.attempts` to the exercise-specific `Result.svelte`
- **`src/lib/exercises/word-morphing/Result.svelte`** — currently renders aggregate stats (correct count, accuracy %, category, duration) from the summary rows

**The rich per-combo detail** (initial combo, each recalled combo, whether each is correct) exists **only in the in-game component** `src/lib/exercises/word-morphing/components/Result.svelte` which operates on live game state, but this data is **never persisted to DB**.

### Two Result Components Confusion

There are two `Result.svelte` files:

1. **`src/lib/exercises/word-morphing/Result.svelte`** — used by the history results page (aggregate stats)
2. **`src/lib/exercises/word-morphing/components/Result.svelte`** — shown immediately after game ends (detailed per-combo breakdown)

The user wants the **history page** (`+page.svelte`) to show detailed per-session results like the in-game component does, but the DB only stores summary data.

---

## Plan

To fix this, we need to **enrich the data model** to store per-combo detail (similar to how Raven Matrices stores per-question details in `raven_attempt`), then update the Result component to render that detail.

### Plan 014: Enrich word-morphing result data and improve result display

**Status:** TODO | **Priority:** P2 | **Effort:** Medium | **Depends on:** Plan 013 (DONE) | **Category:** feature

---

**Why this matters:**
The current word-morphing results page only shows aggregate stats (3/3 correct, 100% accuracy). Users cannot see _which_ combinations they got right/wrong, what the initial words/shapes were, or review their actual recalled answers. This makes the results page nearly useless for learning/review.

**Current state:**

- DB table `word_morphing_exercise_attempt` stores only summary: `category`, `totalCombos`, `correctCount`, `durationSeconds`
- `Playground.svelte` sends a single summary row per session
- `Result.svelte` (history page) renders: correct count, accuracy %, category, duration
- In-game `components/Result.svelte` shows rich detail but operates on ephemeral game state

**Scope:**

- In scope: `src/lib/server/db/models/exercises.ts`, `src/lib/exercises/word-morphing/types/index.ts`, `src/lib/exercises/word-morphing/Playground.svelte`, `src/lib/exercises/word-morphing/Result.svelte`
- Out of scope: Generic results page `+page.svelte`, other exercises

**Steps:**

### Step 1: Extend DB schema and types

In `src/lib/server/db/models/exercises.ts`, add columns to `wordMorphingExerciseAttempt`:

- `comboIndex` INTEGER (1, 2, 3)
- `expectedCombo` TEXT
- `recalledCombo` TEXT (nullable — if user left it blank)
- `isCorrect` INTEGER boolean
- `originalCombo` TEXT (the initial baseline combo: "красный круг" or "круг красный")

In `src/lib/exercises/word-morphing/types/index.ts`, update `WordMorphingSummaryRow` to match.

**Verify:** `grep` the new column names in the schema file.

### Step 2: Update Playground.svelte to save detail rows

In `finishRecall()`, instead of sending a single summary row, construct and send an array of 3 detail rows (one per combo), each containing the new fields plus the original combo and category.

**Verify:** Check that `sendResults()` receives an array of 3 objects.

### Step 3: Rewrite Result.svelte for detailed display

Replace the current aggregate stat cards with:

- **Session header**: Category (Слова/Фигуры), Duration
- **Initial combo**: displayed prominently
- **Per-combo list**: For each of the 3 combos, show:
    - Expected combo
    - Recalled combo (with red/green color for wrong/right)
    - Correctness indicator

Remove the "Точность" (accuracy) block entirely as requested.

**Verify:** Visual inspection of the component renders the 3 combos with correct styling.

### Step 4: Run verification gates

```bash
npm run check
```

**Done criteria:**

- [ ] DB schema includes the 5 new columns
- [ ] Playground sends 3 detail rows per session
- [ ] Result.svelte shows: category, duration, initial combo, and each recalled combo with correctness
- [ ] No accuracy percentage shown
- [ ] All verification commands pass
