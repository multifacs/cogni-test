<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { LettersTrialRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = $derived(results as LettersTrialRow[]);
	const s = $derived(summary(rows));
</script>

<div class="grid grid-cols-4 gap-2 py-2 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Max span</span>
		<strong class="text-base sm:text-2xl">{s.maxSpan}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Раундов</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalRounds}</strong>
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
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Время</span>
		<strong class="text-base sm:text-2xl">{s.elapsed} сек</strong>
	</div>
</div>

{#if s.timeoutTriggered}
	<p class="text-center text-sm font-semibold text-red-400">Время вышло</p>
{/if}

<ResultsChart trials={rows} />
