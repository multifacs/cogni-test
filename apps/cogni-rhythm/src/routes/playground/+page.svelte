<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Playground from '$lib/rhythm/Playground.svelte';
	import type { RhythmResult } from '$lib/rhythm/types';
	import localforage from 'localforage';

	// let componentRef: InstanceType<typeof SvelteComponent> | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);

	// function handleStart() {
	// 	isGameEnd = false;
	// 	if (!isGameRunning) {
	// 		childComponent?.resetGame();
	// 		isGameRunning = true;
	// 	} else {
	// 		// Перезапуск
	// 		childComponent?.stopGame();
	// 		childComponent?.resetGame();
	// 	}
	// }

	// function handleBackOrStop() {
	// 	if (isGameRunning) {
	// 		childComponent?.stopGame();
	// 		isGameRunning = false;
	// 	} else {
	// 		goto('/tests/');
	// 	}
	// }

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		goto(`/results`);
	}

	async function onSendResults(results: RhythmResult[]) {
		await localforage.setItem('results', results);
	}
</script>

<Playground gameEnd={onGameEnd} sendResults={onSendResults}></Playground>
<div class="controls flex items-center justify-center gap-2.5">
	{#if isGameEnd}
		<Button color="blue" goto={`/results`}>Результаты</Button>
	{/if}
</div>
