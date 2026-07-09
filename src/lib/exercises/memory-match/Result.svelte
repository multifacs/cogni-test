<script lang="ts">
	import type { MemoryMatchSummaryRow } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';
	import ResultsChart from './ResultsChart.svelte';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();

	const chartData = results.map((r_raw) => {
		const r = r_raw as MemoryMatchSummaryRow;
		return {
			stage: r.stage,
			durationMs: r.durationMs,
			cardsCount: r.cardsCount,
			flipsCount: r.flipsCount,
			mistakes: r.mistakes
		};
	});

	const totalDurationMs = results.reduce(
		(a: number, b_raw: any) => a + (b_raw as MemoryMatchSummaryRow).durationMs,
		0
	);
	const totalFlips = results.reduce(
		(a: number, b_raw: any) => a + (b_raw as MemoryMatchSummaryRow).flipsCount,
		0
	);
	const totalMistakes = results.reduce(
		(a: number, b_raw: any) => a + (b_raw as MemoryMatchSummaryRow).mistakes,
		0
	);
</script>

<ResultsChart perStage={chartData} />

<div class="grid grid-cols-3 gap-4 py-2">
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Время</span>
		<strong class="text-2xl">{(totalDurationMs / 1000).toFixed(1)} с</strong>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Открытия</span>
		<strong class="text-2xl">{totalFlips}</strong>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Ошибки</span>
		<strong class="text-2xl">{totalMistakes}</strong>
	</div>
</div>
