<script lang="ts">
	import type { CampimetryResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';
	import ResultsChart from '$lib/tests/campimetry/ResultsChart.svelte';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();

	const allTime = Math.round(results.reduce((a: number, b: any) => a + b.time, 0) / 1000);
	const avg = Math.round(
		results.reduce((a: number, b: any) => a + b.time, 0) / results.length / 1000
	);
</script>

<div class="flex flex-col items-center gap-2 py-2">
	<p>Время прохождения: {allTime} с</p>
	<p>Среднее время на один цвет: {avg} с</p>
</div>

<ResultsChart testType="campimetry" results={results as CampimetryResult[]} />
