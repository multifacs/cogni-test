<script lang="ts">
	import type { NumbersResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as NumbersResult}
	<div class="grid grid-cols-2 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Верно</span>
			<strong class="text-2xl">{attempt.correct} / {attempt.total}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Max span</span>
			<strong class="text-2xl">{attempt.digitSpan}</strong>
		</div>
	</div>
{/each}
