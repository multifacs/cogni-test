<script lang="ts">
	import ResultsChart from '$lib/tests/campimetry/ResultsChart.svelte';
	import type { CampimetryResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let { results }: { results: ExerciseResults } = $props();

	const campimetryResults = $derived(results as CampimetryResult[]);

	const allTime = $derived(
		Math.round(campimetryResults.reduce((a: number, b) => a + b.time, 0) / 1000)
	);
	const avg = $derived(
		Math.round(
			campimetryResults.reduce((a: number, b) => a + b.time, 0) /
				campimetryResults.length /
				1000
		)
	);
</script>

<div class="flex flex-col items-center gap-2 py-2">
	<p>Время прохождения: {allTime} с</p>
	<p class="padding-bottom: 1rem;">Среднее время на один цвет: {avg} с</p>
</div>

<ResultsChart testType="campimetry" results={campimetryResults} />
