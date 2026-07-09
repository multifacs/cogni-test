<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, RegularResults } from '$lib/tests/types.js';
	import { type SvelteComponent } from 'svelte';
	import { testRegistry } from '$lib/tests';

	const { data } = $props();
	const slug = $derived(data.slug);
	const test = $derived(testRegistry[slug]);
	let Component: typeof SvelteComponent | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	// GTO session integration: read gtoSessionId from URL params
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	$effect(() => {
		// Reset game state when the test changes (e.g. GTO navigating between tests)
		isGameRunning = true;
		isGameEnd = false;
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
		// In GTO mode, navigation is handled by onSendResults after saving
		if (!gtoSessionId) {
			goto(`/tests/${slug}/results`);
		}
	}

	async function onSendResults(results: RegularResults | MetaResult) {
		if (gtoSessionId) {
			// GTO mode: save result and link to GTO session, advance checkpoint
			const response = await fetch(`/gto/session/${gtoSessionId}/play`, {
				method: 'POST',
				body: JSON.stringify({ action: 'save-result', testType: slug, results }),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				console.error('Failed to save GTO results');
				return;
			}

			const result = await response.json();

			if (result.nextTestUrl) {
				// Navigate to next test in GTO sequence
				goto(result.nextTestUrl);
			} else {
				// All tests done — go to words page
				goto(`/gto/session/${gtoSessionId}/words`);
			}
		} else {
			// Standalone mode: just save the result
			const response = await fetch(`/tests/${slug}/playground`, {
				method: 'POST',
				body: JSON.stringify({ results }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			console.log(response);
		}
	}
</script>

{#if Component}
	<main class="main flex flex-col items-center justify-evenly">
		<Component bind:this={childComponent} gameEnd={onGameEnd} sendResults={onSendResults} {data}
		></Component>
	</main>

	{#if isGameEnd}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto={gtoSessionId ? '/gto' : `/tests/${slug}`}>Назад</Button>
			{#if gtoSessionId}
				<Button color="blue" goto="/gto">К сессиям ГТО</Button>
			{:else}
				<Button color="blue" goto={`/tests/${slug}/results`}>Результаты</Button>
			{/if}
		</section>
	{:else}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={gtoSessionId ? '/gto' : `/tests/${slug}`}>Назад</Button>
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
		<Button color="red" goto={gtoSessionId ? '/gto' : `/tests/${slug}`}>Назад</Button>
		<div></div>
	</section>
{/if}
