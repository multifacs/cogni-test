<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount, type SvelteComponent } from 'svelte';

	const { data } = $props();
	console.log('playground data ', data);
	const slug = data.slug;
	let Component: typeof SvelteComponent | null = $state(null);

	onMount(async () => {
		Component = (await import(`$lib/tests/${slug}/Playground.svelte`)).default;
	});

	// let componentRef: InstanceType<typeof SvelteComponent> | null = $state(null);

	let isGameRunning = $state(false);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	function handleStart() {
		isGameEnd = false;
		if (!isGameRunning) {
			childComponent?.resetGame();
			isGameRunning = true;
		} else {
			// Перезапуск
			childComponent?.stopGame();
			childComponent?.resetGame();
		}
	}

	function handleBackOrStop() {
		if (isGameRunning) {
			childComponent?.stopGame();
			isGameRunning = false;
		} else {
			goto('/tests/');
		}
	}

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
	}
</script>

{#if Component}
	<Component bind:this={childComponent} gameEnd={onGameEnd} {data}></Component>
	<div class="controls flex items-center justify-center gap-2.5">
		<Button color="green" onclick={handleStart}>{isGameRunning ? 'Перезапустить' : 'Начать'}</Button
		>
		<Button color="red" onclick={handleBackOrStop}>{isGameRunning ? 'Стоп' : 'Назад'}</Button>
	</div>
	{#if isGameEnd}
		<Button color="blue" goto={`/tests/${slug}/results`}>Результаты</Button>
	{/if}
{:else}
	<p>Загрузка логики теста...</p>
{/if}
