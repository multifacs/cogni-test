<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	// import type { MetaResult, RegularResult, TestResultMap } from '$lib/tests/types.js';
	// import type { Result } from '$lib/types/index.js';
	// import { delay } from '$lib/utils/common.js';
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
		Component = (await import(`$lib/exercises/${slug}/Playground.svelte`)).default;
	});

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		goto(`/exercises/${slug}/about`);
	}
</script>

{#if Component}
	<main class="main flex flex-col items-center justify-evenly">
		<Component bind:this={childComponent} gameEnd={onGameEnd} {data}></Component>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
		<div></div>
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка упражнения {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
		<div></div>
	</section>
{/if}
