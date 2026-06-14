<script lang="ts">
	import type { PicturesResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as PicturesResult}
	<div class="grid grid-cols-3 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Правильных</span>
			<strong class="text-2xl">{attempt.score}/{attempt.maxScore}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Максимум</span>
			<strong class="text-2xl">{attempt.maxScore}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Точность</span>
			<strong class="text-2xl">{attempt.normalizedScore}%</strong>
		</div>
	</div>
{/each}
