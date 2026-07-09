<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, ExerciseResults } from '$lib/exercises/types.js';
	import { type SvelteComponent } from 'svelte';
	import { exerciseRegistry, EXERCISE_SLUG_TO_TEST_TYPE } from '$lib/exercises';

	const { data } = $props();
	const slug = $derived(data.slug);
	const exercise = $derived(exerciseRegistry[slug]);
	let Component: typeof SvelteComponent | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	// GTO session integration: read gtoSessionId from URL params
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	// Back URL: in GTO mode go to about page, otherwise exercise page
	const backUrl = $derived(
		gtoSessionId
			? `/exercises/${slug}/about?gtoSessionId=${gtoSessionId}`
			: `/exercises/${slug}`
	);

	$effect(() => {
		// Reset game state when the exercise changes (e.g. GTO navigating between tests)
		isGameRunning = true;
		isGameEnd = false;
		Component = null;
		if (exercise?.playground) {
			exercise.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		// In GTO mode, navigation is handled by onSendResults after saving
		if (!gtoSessionId) {
			if (exercise?.result) {
				goto(`/exercises/${slug}/results`);
			}
		}
	}

	async function onSendResults(results: ExerciseResults | MetaResult) {
		if (gtoSessionId) {
			// GTO mode: save result and link to GTO session, advance checkpoint
			const response = await fetch(`/gto/session/${gtoSessionId}/play`, {
				method: 'POST',
				body: JSON.stringify({
					action: 'save-result',
					testType: EXERCISE_SLUG_TO_TEST_TYPE[slug] ?? slug,
					results
				}),
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
				// Navigate to next test's about page in GTO sequence
				goto(result.nextTestUrl);
			} else {
				// All tests done — go to words page
				goto(`/gto/session/${gtoSessionId}/words`);
			}
		} else {
			// Standalone mode: just save the result via the exercise endpoint
			await fetch(`/exercises/${slug}/playground`, {
				method: 'POST',
				body: JSON.stringify({ results }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	}
</script>

{#if Component}
	<main class="main flex flex-col items-center justify-evenly">
		<Component
			bind:this={childComponent}
			gameEnd={onGameEnd}
			sendResults={exercise?.result || gtoSessionId ? onSendResults : undefined}
			{data}
		></Component>
	</main>

	{#if isGameEnd}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto={backUrl}>Назад</Button>
			{#if gtoSessionId}
				<Button color="blue" goto="/gto">К сессиям ГТО</Button>
			{:else if exercise?.result}
				<Button color="blue" goto={`/exercises/${slug}/results`}>Результаты</Button>
			{:else}
				<div></div>
			{/if}
		</section>
	{:else}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={backUrl}>Назад</Button>
			<div></div>
		</section>
	{/if}
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка упражнения {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={backUrl}>Назад</Button>
		<div></div>
	</section>
{/if}
