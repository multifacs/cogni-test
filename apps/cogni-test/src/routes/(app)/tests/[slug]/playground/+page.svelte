<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import type { MetaResult, RegularResult, TestResultMap } from '$lib/tests/types.js';
	import type { Result } from '$lib/types/index.js';
	import { delay } from '$lib/utils/common.js';
	import { onMount, type SvelteComponent } from 'svelte';

	const { data } = $props();
	// console.log('playground data ', data);
	const slug = data.slug;
	let Component: typeof SvelteComponent | null = $state(null);

	// let componentRef: InstanceType<typeof SvelteComponent> | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	onMount(async () => {
		Component = (await import(`$lib/tests/${slug}/Playground.svelte`)).default;
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
		goto(`/tests/${slug}/results`);
	}

	async function onSendResults<T extends keyof TestResultMap>(
		results: RegularResult<T> | MetaResult<T>
	) {
		const response = await fetch(`/tests/${slug}/playground`, {
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
			<Button color="blue" goto={`/tests/${slug}/results`}>Результаты</Button>
		{/if}
		<Button color="red" goto={`/tests/${slug}`}>Назад</Button>
	</div>
{:else}
	<p>Загрузка логики теста...</p>
{/if}
