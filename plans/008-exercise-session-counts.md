# Plan 008: Show exercise session counts on exercises listing page

**Base commit:** `79619db`
**Status:** TODO
**Effort:** Small
**Depends on:** Plans 001–007 (all DONE)

## Problem

The tests listing page (`src/routes/(app)/tests/+page.svelte`) shows per-test completion status ("Пройдено: N" / "Не пройдено") by fetching `testSessionCounts` from the server load function. The exercises listing page (`src/routes/(app)/exercises/+page.svelte`) has no such feature — users see no indication of which exercises they've already completed.

## Solution

Mirror the pattern from the tests page: fetch exercise session counts in the server load function and display them next to each exercise.

## Context

### How it works on the tests page

`src/routes/(app)/tests/+page.server.ts` calls `getTestSessionCounts(userId)` (from `src/lib/server/db/controllers/test.ts`) which queries the `session` table grouped by `testType`, returning `Record<string, number>`. The page component then renders the count or a "Не пройдено" label.

Key fact: **exercise sessions are stored in the same `session` table** with the same `testType` column. Exercise type names (`'attention'`, `'emoji'`, `'flanker'`, `'letters'`, `'numbers'`, `'pictures'`, `'ravenMatrices'`) are all valid values in that column. This means `getTestSessionCounts` can be reused as-is for exercises — just pass exercise type names instead of test type names, or call it without filtering to get counts across everything.

See `src/lib/server/db/controllers/result.ts:34-50` for the full mapping of session type strings to attempt tables — these same strings are what appear in the `session.testType` column.

### Exercise definitions

Exercise metadata lives in `src/lib/exercises/index.ts`. Each exercise has a `name` property (e.g., `'word-morphing'`, `'campimetry'`, `'memory-match'`, `'nback-stream'`, `'raven-matrices'`, `'emoji'`, `'attention'`, `'pictures'`, `'numbers'`, `'flanker'`, `'letters'`, `'road-trip'`, `'not-lost'`). Not all exercises save results to DB yet (e.g., `word-morphing`, `campimetry`, `memory-match`, `nback-stream`, `road-trip`, `not-lost` have no DB-saving implemented), but they will show 0 sessions which is correct.

### Important naming mismatch

The exercise named `'raven-matrices'` in the exercises list uses session type `'ravenMatrices'` in the database (see `attemptTableMap` in `result.ts:49`). The plan must map exercise `name` → session type when looking up counts, OR simply use the raw `name` and accept that some won't match until they're consistent. The cleanest approach: use the exercise's `name` directly since most match their DB type name already, but handle the one mismatch explicitly if needed. However, checking the data more carefully:

- Exercise names: `word-morphing`, `campimetry`, `memory-match`, `nback-stream`, `raven-matrices`, `emoji`, `attention`, `pictures`, `numbers`, `flanker`, `letters`, `road-trip`, `not-lost`
- Session types in DB: `math`, `stroop`, `memory`, `swallow`, `munsterberg`, `campimetry`, `rhythm`, `memoryMatch`, `attention`, `emoji`, `flanker`, `letters`, `numbers`, `pictures`, `ravenMatrices`

Mismatches between exercise name and session type:
| Exercise name | DB session type |
|---|---|
| `memory-match` | `memoryMatch` |
| `raven-matrices` | `ravenMatrices` |
| Others either match exactly or have no DB saves yet |

The simplest approach: don't try to map — just query ALL session types for the user via `getTestSessionCounts(userId)` with no filter, then map each exercise name to its session count using an explicit lookup table. Or even simpler: add a small `exerciseNameToSessionType` map in the server load function.

## Steps

### Step 1: Add session counts to the exercises page server load

Edit `src/routes/(app)/exercises/+page.server.ts`.

Current code:
```ts
import { exercises } from '$lib/exercises';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	let predictedAge = null;
	if (!userId) return { exercises };

	const features = await getFeaturesFromDB(userId);
	if (features) predictedAge = await runAgeModel(features);
	console.log(predictedAge)
	return {
		exercises,
		userId,
		predictedAge
	};
}
```

Add the import and call for `getTestSessionCounts`, plus a mapping from exercise `name` to DB session type:

```ts
import { exercises } from '$lib/exercises';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import type { PageServerLoad } from './$types';

const exerciseToSessionType: Record<string, string> = {
	'word-morphing': 'word-morphing',
	campimetry: 'campimetry',
	'memory-match': 'memoryMatch',
	'nback-stream': 'nback-stream',
	'raven-matrices': 'ravenMatrices',
	emoji: 'emoji',
	attention: 'attention',
	pictures: 'pictures',
	numbers: 'numbers',
	flanker: 'flanker',
	letters: 'letters',
	'road-trip': 'road-trip',
	'not-lost': 'not-lost'
};

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	let predictedAge = null;
	let exerciseSessionCounts: Record<string, number> = {};
	if (!userId) return { exercises };

	const features = await getFeaturesFromDB(userId);
	if (features) predictedAge = await runAgeModel(features);

	const rawCounts = await getTestSessionCounts(userId);
	for (const ex of exercises) {
		const sessionType = exerciseToSessionType[ex.name];
		if (sessionType && rawCounts[sessionType]) {
			exerciseSessionCounts[ex.name] = rawCounts[sessionType];
		}
	}

	return {
		exercises,
		userId,
		predictedAge,
		exerciseSessionCounts
	};
}
```

**Verify:** Run `npm run check` — must pass with no new errors.

### Step 2: Update the exercises +page.svelte to show session counts

Edit `src/routes/(app)/exercises/+page.svelte`.

Current markup inside the `{#each}` block:
```svelte
{#each data.exercises as { name, title, path, img }}
	<a
		href={path}
		class="flex items-center justify-between rounded-2xl bg-gray-600 p-3 shadow transition hover:bg-gray-100 hover:text-black"
	>
		<span class="text-lg">{title}</span>
		<img src={img} alt={name} class="h-14 w-14 rounded-xl bg-white" />
	</a>
{/each}
```

Replace the `<span class="text-lg">{title}</span>` with a flex column matching the tests page pattern, adding `$derived` for the counts state:

```svelte
<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { data } = $props();
	let exerciseSessionCounts: Record<string, number> = $state({});

	onMount(() => {
		userStore.set(data.user || '');
		if (data.exerciseSessionCounts) {
			exerciseSessionCounts = data.exerciseSessionCounts;
		}
	});
</script>
```

And update the `{#each}` body:
```svelte
{#each data.exercises as { name, title, path, img }}
	<a
		href={path}
		class="flex items-center justify-between rounded-2xl bg-gray-600 p-3 shadow transition hover:bg-gray-100 hover:text-black"
	>
		<div class="flex flex-col gap-1">
			<span class="text-lg">{title}</span>
			{#if exerciseSessionCounts[name]}
				<span class="text-sm font-medium text-lime-200">
					Пройдено: {exerciseSessionCounts[name]}
				</span>
			{:else}
				<span class="text-sm text-orange-400"> Не пройдено </span>
			{/if}
		</div>
		<img src={img} alt={name} class="h-14 w-14 rounded-xl bg-white" />
	</a>
{/each}
```

This matches the exact pattern used on the tests page at `src/routes/(app)/tests/+page.svelte:80-86`.

**Verify:** Run `npm run check` and `npm run lint` — both must pass.

### Step 3: Manual verification

1. Run `npm run dev`
2. Log in as a user who has completed some exercises
3. Navigate to `/exercises`
4. Confirm completed exercises show "Пройдено: N" in lime-green
5. Confirm uncompleted exercises show "Не пройдено" in orange
6. Test while logged out — should render the list without any counts section (no crash)

## Files in scope

- `src/routes/(app)/exercises/+page.server.ts` — add session count fetching
- `src/routes/(app)/exercises/+page.svelte` — display session counts

## Files out of scope

- `src/lib/server/db/controllers/test.ts` — no changes needed; `getTestSessionCounts` is reused as-is
- `src/lib/exercises/index.ts` — no changes needed
- Any other route files or components

## Done criteria

1. `npm run check` passes
2. `npm run lint` passes
3. Logged-in user sees "Пройдено: N" (lime-green) next to exercises they've completed on `/exercises`
4. Uncompleted exercises show "Не пройдено" (orange)
5. Logged-out user sees the exercise list without errors

## Maintenance notes

- When a new exercise is added to `src/lib/exercises/index.ts`, its name must also be added to the `exerciseToSessionType` map in `+page.server.ts`. If its session type matches its exercise `name` exactly, still add it for explicitness.
- If exercise names are ever standardized to match their DB session types (removing hyphens/camelCase mismatches), the `exerciseToSessionType` map could be simplified or removed.
