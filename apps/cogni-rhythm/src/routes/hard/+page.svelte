<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Playground from '$lib/rhythm/Playground.svelte';
	import type { RhythmResult } from '$lib/rhythm/types';
	import localforage from 'localforage';

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		goto(`/results`);
	}

	async function onSendResults(results: RhythmResult[]) {
		await localforage.setItem('results-hard', results);
	}
</script>

<Playground difficulty="hard" gameEnd={onGameEnd} sendResults={onSendResults}></Playground>
<div class="controls flex items-center justify-center gap-2.5">
	{#if isGameEnd}
		<Button color="blue" goto={`/results`}>Результаты</Button>
	{/if}
</div>
