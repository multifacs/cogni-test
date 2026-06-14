<script lang="ts">
	import type { NBackSummaryRow } from './types';
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
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as NBackSummaryRow}
	<div class="grid grid-cols-3 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Верно</span>
			<strong class="text-2xl">{attempt.correct}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">% точности</span>
			<strong class="text-2xl">{(attempt.accuracy / 10).toFixed(1)}%</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Средний RT</span>
			<strong class="text-2xl">{attempt.avgRtMs} мс</strong>
		</div>
	</div>
	<div class="grid grid-cols-3 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">{attempt.nBack}-back</span>
			<strong class="text-2xl">{attempt.domain === 'figures' ? 'Фигуры' : 'Числа'}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Стимулов</span>
			<strong class="text-2xl">{attempt.totalStimuli}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Длительность</span>
			<strong class="text-2xl">{(attempt.durationMs / 1000).toFixed(0)} с</strong>
		</div>
	</div>
{/each}
