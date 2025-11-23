<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import type { MetaResult, RegularResult, TestResultMap } from '$lib/tests/types.js';
	import { onMount, type SvelteComponent } from 'svelte';

    let { data } = $props();
	let Component: typeof SvelteComponent | null = $state(null);

	// let componentRef: InstanceType<typeof SvelteComponent> | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	onMount(async () => {
		Component = (await import(`$lib/rhythm/Playground.svelte`)).default;
	});

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

	async function onSendResults<T extends keyof TestResultMap>(
		results: RegularResult<T> | MetaResult<T>
	) {
		const response = await fetch(`/playground`, {
			method: 'POST',
			body: JSON.stringify({ results }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		console.log(response);
	}
</script>

{#if Component}
	<Component bind:this={childComponent} gameEnd={onGameEnd} sendResults={onSendResults} {data}
	></Component>
	<div class="controls flex items-center justify-center gap-2.5">
		{#if isGameEnd}
			<Button color="blue" goto={`/results`}>Результаты</Button>
		{/if}
	</div>
{:else}
	<p>Загрузка логики теста...</p>
{/if}
