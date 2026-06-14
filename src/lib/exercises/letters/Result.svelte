<script lang="ts">
	import type { LettersResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as LettersResult}
	<div class="grid grid-cols-3 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Max span</span>
			<strong class="text-2xl">{attempt.maxSpan}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Раундов</span>
			<strong class="text-2xl">{attempt.roundsCompleted}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Время</span>
			<strong class="text-2xl">{attempt.elapsed} сек</strong>
		</div>
	</div>
	{#if attempt.timeoutTriggered}
		<p class="text-center text-sm font-semibold text-red-400">Время вышло</p>
	{/if}
{/each}
