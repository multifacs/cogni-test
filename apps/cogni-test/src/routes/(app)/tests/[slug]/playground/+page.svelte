<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, RegularResults } from '$lib/tests/types.js';
	import { type SvelteComponent } from 'svelte';
	import { testRegistry } from '$lib/tests';

	const { data } = $props();
	const slug = data.slug;
	const test = $derived(testRegistry[slug]);
	let Component: typeof SvelteComponent | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	$effect(() => {
		Component = null;
		if (test) {
			test.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		goto(`/tests/${slug}/results`);
	}

	async function onSendResults(results: RegularResults | MetaResult) {
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
	<main class="main flex flex-col items-center justify-evenly">
		<Component bind:this={childComponent} gameEnd={onGameEnd} sendResults={onSendResults} {data}
		></Component>
	</main>

	{#if isGameEnd}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto={`/tests/${slug}`}>Назад</Button>
			<Button color="blue" goto={`/tests/${slug}/results`}>Результаты</Button>
		</section>
	{:else}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={`/tests/${slug}`}>Назад</Button>
			<div></div>
		</section>
	{/if}
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={`/tests/${slug}`}>Назад</Button>
		<div></div>
	</section>
{/if}
