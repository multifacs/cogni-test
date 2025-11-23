<script lang="ts">
	// import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';
	import type { RhythmResult } from '$lib/rhythm/types';
	import localforage from 'localforage';
	import ResultsChart from '$lib/rhythm/ResultsChart.svelte';

	let results: RhythmResult[] | null = $state(null);

	onMount(async () => {
		const resultsLoaded: RhythmResult[] | null = await localforage.getItem('results');
		if (resultsLoaded) {
			console.log(results);
			results = resultsLoaded;
		}
	});
</script>

{#if results}
	<div
		class="test-container flex min-h-0 w-full max-w-2xl flex-col items-center gap-4 overflow-y-scroll rounded-2xl bg-gray-700 p-2"
	>
		<ResultsChart {results} />
	</div>
{:else}
	<h1>Попыток нет</h1>
{/if}
<div class="controls flex items-center justify-center gap-2.5">
	<Button color="blue" goto={`/about`}>Заново</Button>
</div>

<style>
	.test-container {
		scrollbar-width: none;
	}
</style>
