<script lang="ts">
	// import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount, type SvelteComponent } from 'svelte';
	import type { RhythmResult } from '$lib/rhythm/types';
	import localforage from 'localforage';

	let results: RhythmResult[] | null = $state(null);

	let Component: typeof SvelteComponent | null = $state(null);

	onMount(async () => {
		const resultsLoaded: RhythmResult[] | null = await localforage.getItem('results');
		if (resultsLoaded) {
			console.log(results);
			results = resultsLoaded;
		}

		try {
			Component = (await import(`$lib/rhythm/ResultsChart.svelte`)).default;
		} catch (err) {
			console.log(err);
		}
		if (Component) return;
	});
</script>

<div
	class="test-container flex min-h-0 w-full max-w-2xl flex-col items-center gap-4 overflow-y-scroll rounded-2xl bg-gray-700 p-2"
>
	<Component {results} />
</div>

<div class="controls flex items-center justify-center gap-2.5">
	<Button color="blue" goto={`/about`}>Заново</Button>
</div>

<style>
	.test-container {
		scrollbar-width: none;
	}
</style>
