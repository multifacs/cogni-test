# Plan 002: Save Emoji Exercise Results to DB + Add "Результаты" Button/Page

**Status:** DONE
**Effort:** Medium
**Depends on:** Plan 001 (done — provides exercise route infrastructure)

## Problem

The emoji exercise (`src/lib/exercises/emoji/`) collects `EmojiResult` data (`score`, `mistakes`, `totalAnswers`, `accuracy`, `trialLog`) but:
1. Never persists results to the database
2. Uses deprecated `createEventDispatcher` instead of callback props
3. Shows inline result cards in Playground instead of navigating to a dedicated results page
4. Has no "Результаты" button after game completion

The attention exercise already implements this full flow and is the reference pattern.

## Current State

### Emoji exercise files
| File | Current behavior |
|------|-----------------|
| `types.ts` | Defines `EmojiResult = { score, mistakes, totalAnswers, accuracy, trialLog }` and `TrialLog` |
| `EmojiGame.svelte` | Uses deprecated `createEventDispatcher<{ done: EmojiResult }>()`; dispatches on timer expiry |
| `Playground.svelte` | Listens to `done` event via `on:done`, shows inline result cards + "Пройти заново" button |
| `About.svelte` | Static description text |

### Already-done infrastructure from Plan 001
- The route page at `exercises/[slug]/playground/+page.svelte` already passes `gameEnd` / `sendResults` props and shows conditional "Результаты" button based on `exercise?.result`
- The POST handler at `exercises/[slug]/playground/+server.ts` exists but only allows `'attention'`
- The GET endpoint at `exercises/[slug]/results/+server.ts` exists but only serves `'attention'`
- The SSR loader at `exercises/[slug]/results/+page.server.ts` exists but only serves `'attention'`

## Design Decisions

1. **Follow the attention pattern exactly** — callback props on game component, thin forwarding wrapper in Playground, route page owns POST/navigation
2. **`trialLog` is not persisted to DB** — it contains variable-length arrays of objects with string fields (emojis). This is complex tabular data that doesn't fit neatly into a flat attempt row. For MVP, store only the summary metrics (`score`, `mistakes`, `totalAnswers`, `accuracy`). If trial-level detail is needed later, add an `emoji_trial` table or JSON column.
3. **Add `'emoji'` as a valid `ExerciseType`** — just like `'attention'` was added
4. **Extend existing route server handlers** to accept `'emoji'` alongside `'attention'` — no new route files needed

## Step-by-step Implementation

### Step 1: Add `emojiAttempt` table to DB schema

**File:** `src/lib/server/db/models/exercises.ts`

Add after the existing `attentionAttempt` definition:

```ts
export const emojiAttempt = sqliteTable('emoji_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	score: integer('score').notNull(),
	mistakes: integer('mistakes').notNull(),
	totalAnswers: integer('total_answers').notNull(),
	accuracy: integer('accuracy').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
```

Notes:
- `attempt` uses `.default(1).notNull()` (same pattern as `attentionAttempt`) because `EmojiResult` has no `attempt` field — Drizzle would send `null` otherwise → NOT NULL violation.
- `accuracy` stored as integer (0-100) since `EmojiResult.accuracy` is already `Math.round((score/totalAnswers)*100)`.
- No `trialLog` column (see design decision #2).
- Re-exported automatically via existing `export * from './models/exercises'` in `schema.ts`.

### Step 2: Register `emojiAttempt` in the result controller

**File:** `src/lib/server/db/controllers/result.ts`

1. Update import:
```ts
import { attentionAttempt, emojiAttempt } from '$lib/server/db/models/exercises';
```

2. In `postResult()`, add `'emoji'` to `insertAttempt` map:
```ts
const insertAttempt = {
    // ...existing...
    attention: attentionAttempt,
    emoji: emojiAttempt
}[testType];
```

3. In `getResults()`, add `'emoji'` to `attemptTable` map:
```ts
const attemptTable = {
    // ...existing...
    attention: db.query.attentionAttempt,
    emoji: db.query.emojiAttempt
}[testType] as typeof db.query.campimetryAttempt;
```

### Step 3: Add `'emoji'` as a valid `ExerciseType`

**File:** `src/lib/exercises/types.ts`

1. Import `EmojiResult`:
```ts
import type { EmojiResult } from '$lib/exercises/emoji/types';
```

2. Extend `ExerciseType`:
```ts
export type ExerciseType =
    | 'attention'
    | 'emoji';
```

3. Extend `ExerciseResultMap`:
```ts
export type ExerciseResultMap = {
    attention: AttentionResult;
    emoji: EmojiResult;
};
```

4. Extend `ExerciseResult` and `ExerciseResults` unions:
```ts
export type ExerciseResult =
    | AttentionResult
    | EmojiResult;

export type ExerciseResults =
    | AttentionResult[]
    | EmojiResult[];
```

Note: The result controller (`src/lib/server/db/controllers/result.ts`) uses `AnySessionType = TestType | ExerciseType`, and `postResult`/`getResults` accept this type. The lookup maps use `Record<string, any>` keyed by both test and exercise slugs.

### Step 4: Update `EmojiGame.svelte` — replace `createEventDispatcher` with callback props

**File:** `src/lib/exercises/emoji/EmojiGame.svelte`

Replace the dispatcher pattern with props:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { EmojiResult, TrialLog } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: EmojiResult[]) => void;
	} = $props();

	// ...existing state stays the same...

	function finishTest() {
		finished = true;
		started = false;
		cleanup();
		const result: EmojiResult = {
			score,
			mistakes,
			totalAnswers,
			accuracy: totalAnswers === 0 ? 0 : Math.round((score / totalAnswers) * 100),
			trialLog
		};
		sendResults([result]);
		gameEnd();
	}

	// ...rest unchanged...
</script>
```

Key changes:
- Remove `createEventDispatcher` import and usage
- Add `gameEnd` and `sendResults` as `$props()`
- Call `sendResults([result])` then `gameEnd()` instead of `dispatch('done', result)`
- Keep all other logic identical

### Step 5: Update `Playground.svelte` — forward props, remove inline results

**File:** `src/lib/exercises/emoji/Playground.svelte`

Replace entire file:

```svelte
<script lang="ts">
	import EmojiGame from './EmojiGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<EmojiGame {gameEnd} {sendResults} />
```

This mirrors `attention/Playground.svelte` exactly. All inline result display ("Пройти заново", score/mistakes/accuracy cards) is removed — the route page handles post-game navigation now.

### Step 6: Add `result` loader to emoji entry in exercise registry

**File:** `src/lib/exercises/index.ts`

Update the emoji loader entry:

```ts
emoji: {
    about: () => import('./emoji/About.svelte'),
    playground: () => import('./emoji/Playground.svelte'),
    result: () => import('./emoji/Result.svelte')
},
```

Adding the `result` lazy loader makes `exercise?.result` truthy for emoji, which means:
- The playground route page will pass `sendResults` prop
- The "Результаты" button will appear after game end
- On game end, page navigates to `/exercises/emoji/results`

### Step 7: Update route server handlers to support `'emoji'`

**File:** `src/routes/(app)/exercises/[slug]/playground/+server.ts`

Change the slug check from `!== 'attention'` to include `'emoji'`:

```ts
if (!['attention', 'emoji'].includes(slug)) {
    return json({ error: 'unknown exercise' }, { status: 400 });
}
const { results }: { results: ExerciseResults | MetaResult } = await request.json();
const userId = cookies.get('user_id') as string;

await postResult(results, slug as AnySessionType, userId);
return json('success', { status: 201 });
```

Note: Instead of hard-coding the test type per slug, use `slug as AnySessionType` (where `AnySessionType = TestType | ExerciseType`) so both `'attention'` and `'emoji'` are handled by the same code path.

**File:** `src/routes/(app)/exercises/[slug]/results/+server.ts`

Same pattern:

```ts
if (!['attention', 'emoji'].includes(slug)) {
    return json({ results: [] });
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return json({ results });
```

**File:** `src/routes/(app)/exercises/[slug]/results/+page.server.ts`

Same pattern:

```ts
if (!['attention', 'emoji'].includes(slug)) {
    return { results: [] };
}
const userId = cookies.get('user_id') as string;
const results = await getResults(slug as AnySessionType, userId);
return { results };
```

### Step 8: Create `Result.svelte` for the emoji exercise

**New file:** `src/lib/exercises/emoji/Result.svelte`

Self-contained result display component, modeled after `attention/Result.svelte`. Fetches its own data via the GET endpoint, renders accordion UI with Верно/Ошибки/Точность cards plus navigation buttons:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import type { EmojiResult } from './types';
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
						<div class="box-border flex flex-col items-center border-t p-2">
							{#each result.attempts as attempt_raw, i (i)}
								{@const attempt = attempt_raw as EmojiResult}
								<div class="grid grid-cols-3 gap-4 py-2">
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Верно</span>
										<strong class="text-2xl">{attempt.score}</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Ошибки</span>
										<strong class="text-2xl">{attempt.mistakes}</strong>
									</div>
									<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
										<span class="mb-2 block opacity-70">Точность</span>
										<strong class="text-2xl">{attempt.accuracy}%</strong>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/emoji">Назад</Button>
		<Button color="blue" goto="/exercises/emoji/playground">Пройти снова</Button>
	</section>
{:else}
	<main class="main box-border">
		<h1>Попыток нет</h1>
	</main>

	<section class="low-content grid grid-cols-2 gap-4">
		<Button color="red" goto="/exercises/emoji">Назад</Button>
		<Button color="blue" goto="/exercises/emoji/playground">Пройти снова</Button>
	</section>
{/if}
```

Displays three metric cards per attempt: Верно (score), Ошибки (mistakes), Точность (accuracy%). Same accordion pattern as attention Result.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/server/db/models/exercises.ts` | Edit — add `emojiAttempt` table |
| `src/lib/server/db/controllers/result.ts` | Edit — import `emojiAttempt`, register in both maps |
| `src/lib/exercises/types.ts` | Edit — add `'emoji'` to `ExerciseType`, `ExerciseResult`, `ExerciseResults`, `ExerciseResultMap`; import `EmojiResult` |
| `src/lib/exercises/index.ts` | Edit — add `result` loader to emoji entry |
| `src/lib/exercises/emoji/EmojiGame.svelte` | Edit — replace `createEventDispatcher` with `gameEnd`/`sendResults` props |
| `src/lib/exercises/emoji/Playground.svelte` | Edit — forward props, remove inline result display |
| `src/lib/exercises/emoji/Result.svelte` | **New** — self-contained result display component |
| `src/routes/(app)/exercises/[slug]/playground/+server.ts` | Edit — extend slug check to include `'emoji'` |
| `src/routes/(app)/exercises/[slug]/results/+server.ts` | Edit — extend slug check to include `'emoji'` |
| `src/routes/(app)/exercises/[slug]/results/+page.server.ts` | Edit — extend slug check to include `'emoji'` |

No new route files needed — the existing route infrastructure from Plan 001 handles everything.

## Files Explicitly Out of Scope

- Persisting `trialLog` to DB (complex nested data; can be added later with a separate table or JSON column)
- Any other exercise besides emoji
- The test routes under `src/routes/(app)/tests/`
- Svelte 5 migration of other exercises (besides EmojiGame's `createEventDispatcher` removal)
- Chart.js visualizations (card-based display is sufficient for MVP)

## Done Criteria

Run these commands and verify expected output:

1. `npm run check` — exits 0, no type errors
2. `npm run lint` — exits 0, no new lint issues
3. `npm run build` — succeeds
4. Schema push: `npm run init-db-dev`, then verify table exists:
   ```
   npx better-sqlite3 sqlite.db "SELECT sql FROM sqlite_master WHERE name='emoji_attempt';"
   ```
5. Manual E2E flow:
   - Navigate to `/exercises/emoji/about`
   - Start a game, play through until the 60-second timer expires
   - Verify: browser DevTools shows POST `/exercises/emoji/playground` returns 201
   - Verify: page navigates to `/exercises/emoji/results`
   - Verify: results page shows accordion entry with date, expands to show Верно/Ошибки/Точность cards
   - Click "Пройти снова", complete another round
   - Go back to results → two accordion entries visible
6. Regression check for other exercises:
   - Open `/exercises/word-morphing/playground`, confirm it loads without error
   - Bottom buttons still show 3-col layout during play and after game end
7. Regression check for attention exercise:
   - Open `/exercises/attention/playground`, complete a game
   - Verify results still save and show correctly

## Maintenance Notes

- Adding DB persistence for another exercise follows the exact same pattern: add table to `models/exercises.ts` → register in controller maps → add to `ExerciseType` union → add `result` loader to `exerciseLoaders` → create self-contained `Result.svelte` → update Playground to accept `gameEnd`/`sendResults` props → extend the slug allow-list in route handlers.
- The `ExerciseType` union and result controller lookup maps must stay in sync with DB tables — if you add an exercise table, update all three places. The controller uses `AnySessionType = TestType | ExerciseType`.
- The `attempt=1` default convention means each completed game is one row. If multi-round sessions are added later, increment `attempt` per round and group by `sessionId`.
- The `exercise?.result` check drives the "Результаты" button visibility — exercises without a `result` loader still work exactly as before.
- This plan addresses the `createEventDispatcher` deprecation only for `EmojiGame.svelte`. Other exercises still use it.

## Escape Hatches

- If `drizzle-kit push --force` fails due to existing data conflicts, run `npm run init-db-dev` instead.
- If the user doesn't have a `user_id` cookie (not logged in), `postResult` will receive `undefined` as `userId` which violates the NOT NULL constraint on `session.userId`. Same pre-existing issue as all tests/exercises routes.
- If an exercise Playground component doesn't accept `sendResults`/`gameEnd` props yet, Svelte passes extra props silently — the component must be updated to use them when adding DB support.
