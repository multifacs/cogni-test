<script lang="ts">
	// import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';
	import type { RhythmResult } from '$lib/rhythm/types';
	import localforage from 'localforage';
	import ResultsChart from '$lib/rhythm/ResultsChart.svelte';
	import { uploadResultsToDatabase } from '$lib';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let resultsEasy: RhythmResult[] | null = $state(null);
	let resultsMedium: RhythmResult[] | null = $state(null);
	let resultsHard: RhythmResult[] | null = $state(null);

	let message: null | boolean = $state(null);

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

		try {
			setTimeout(async () => {
				const uploadMessage = await uploadResultsToDatabase();
				// if (uploadMessage) message = uploadMessage.replaceAll('_', '\n');
				if (uploadMessage) message = uploadMessage;
				if (uploadMessage == false) message = uploadMessage;

				console.log(uploadMessage);
			}, 2000);
		} catch (error) {
			console.error('Error uploading results on mount:', error, `message: ${message}`);
			message = false;
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

<div class="w-full flex flex-col items-center gap-1">
	<h2>Последние результаты</h2>

	<div class="overflow-auto w-full flex flex-col items-center gap-6 p-2">
		{#if resultsEasy}
			<div class="test-container flex max-h-52 w-full max-w-2xl flex-col items-center rounded-2x">
				<ResultsChart title="Легкий уровень" results={resultsEasy} />
			</div>
		{:else}
			<span class="text-sm font-bold">Легкий уровень не пройден</span>
		{/if}

		{#if resultsMedium}
			<div class="test-container flex max-h-52 w-full max-w-2xl flex-col items-center rounded-2x">
				<ResultsChart title="Средний уровень" results={resultsMedium} />
			</div>
		{:else}
			<span class="text-sm font-bold">Средний уровень не пройден</span>
		{/if}

		{#if resultsHard}
			<div class="test-container flex max-h-52 w-full max-w-2xl flex-col items-center rounded-2x">
				<ResultsChart title="Сложный уровень" results={resultsHard} />
			</div>
		{:else}
			<span class="text-sm font-bold">Сложный уровень не пройден</span>
		{/if}
	</div>

	<div class="flex flex-col items-center justify-center gap-2.5">
		<Button color="purple" goto={`/about`}>К тестам</Button>

		{#if message == null}
			<Spinner></Spinner>
		{:else if message == true}
			<span class="text-sm">Результаты сохранены на сервер.</span>
		{:else if message == false}
			<span class="text-sm text-wrap">Ошибка сохранения на сервер. Повторите попытку позднее.</span>
		{/if}
	</div>
</div>

<style>
	.test-container {
		/* scrollbar-width: none; */
		background: radial-gradient(circle at top, #111827 0, #020617 60%);
		border-radius: 1.25rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.6);
	}
</style>
