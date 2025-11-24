<script lang="ts">
	// import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';
	import type { RhythmResult } from '$lib/rhythm/types';
	import localforage from 'localforage';
	import ResultsChart from '$lib/rhythm/ResultsChart.svelte';

	let resultsEasy: RhythmResult[] | null = $state(null);
	let resultsMedium: RhythmResult[] | null = $state(null);
	let resultsHard: RhythmResult[] | null = $state(null);

	onMount(async () => {
		const resultsEasyLoaded: RhythmResult[] | null = await localforage.getItem('results-easy');
		if (resultsEasyLoaded) {
			console.log(resultsEasy);
			resultsEasy = resultsEasyLoaded;
		}

		const resultsMediumLoaded: RhythmResult[] | null = await localforage.getItem('results-medium');
		if (resultsMediumLoaded) {
			console.log(resultsMedium);
			resultsMedium = resultsMediumLoaded;
		}

		const resultsHardLoaded: RhythmResult[] | null = await localforage.getItem('results-hard');
		if (resultsHardLoaded) {
			console.log(resultsHard);
			resultsHard = resultsHardLoaded;
		}
	});

	function uploadResults() {
		console.log(navigator.onLine);
		if ('serviceWorker' in navigator && navigator.onLine) {
			navigator.serviceWorker.ready.then((reg) => {
				reg.active?.postMessage({
					type: 'UPLOAD_RESULTS'
				});
			});
		}
	}
</script>

<div class="overflow-auto w-full flex flex-col items-center gap-6 p-2">
	{#if resultsEasy}
		<div class="test-container flex max-h-52 w-full max-w-2xl flex-col items-center rounded-2x">
			<h2 class="text-2xl font-bold text-white">Легкий уровень</h2>
			<ResultsChart results={resultsEasy} />
		</div>
	{:else}
		<h2>Легкий уровень не пройден</h2>
	{/if}

	<hr />

	{#if resultsMedium}
		<div class="test-container flex max-h-52 w-full max-w-2xl flex-col items-center rounded-2x">
			<h2 class="text-2xl font-bold text-white">Средний уровень</h2>
			<ResultsChart results={resultsMedium} />
		</div>
	{:else}
		<h2>Средний уровень не пройден</h2>
	{/if}

	<hr />

	{#if resultsHard}
		<div class="test-container flex max-h-52 w-full max-w-2xl flex-col items-center rounded-2x">
			<h2 class="text-2xl font-bold text-white">Сложный уровень</h2>
			<ResultsChart results={resultsHard} />
		</div>
	{:else}
		<h2>Сложный уровень не пройден</h2>
	{/if}
</div>

<div class="controls flex items-center justify-center gap-2.5 mt-4">
	<Button color="purple" goto={`/about`}>Заново</Button>

	<Button color="red" onclick={uploadResults}>Загрузить результаты онлайн</Button>
</div>

<style>
	.test-container {
		scrollbar-width: none;
	}
</style>
