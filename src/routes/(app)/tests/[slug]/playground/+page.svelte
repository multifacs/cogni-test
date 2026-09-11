<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, RegularResults } from '$lib/tests/types.js';
	import { getContext, type Component as ComponentType } from 'svelte';
	import { testRegistry } from '$lib/tests';
	import type { DevAction } from '$lib/types/header-action';

	const { data } = $props();
	const slug = $derived(data.slug);
	const test = $derived(testRegistry[slug]);
	let Component: ComponentType | null = $state(null);

	let isGameEnd = $state(false);

	// GTO session integration: read gtoSessionId from URL params
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	import type { PathnameWithSearchOrHash } from '$app/types';
	import { resolve } from '$app/paths';

	const backUrl = $derived(
		(gtoSessionId
			? `/tests/${slug}/about?gtoSessionId=${gtoSessionId}`
			: `/tests/${slug}`) satisfies PathnameWithSearchOrHash
	);

	$effect(() => {
		// Reset game state when the test changes (e.g. GTO navigating between tests)
		isGameEnd = false;
		Component = null;
		if (test) {
			test.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	// Shared header context (owned by (app) layout): DEV-only banner slot
	const headerContext = getContext<{ value: string; devAction: DevAction }>('headerText');

	// DEV autoplay: ask the server for random results, then push them through
	// the same save path as a real game run. In GTO mode onSendResults owns
	// the navigation, so onGameEnd (which only navigates standalone) is skipped.
	async function runAutoplay() {
		const response = await fetch(`/tests/${slug}/playground`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ action: 'generate-random' })
		});

		if (!response.ok) {
			console.error('Autoplay generation failed:', response.status);
			return;
		}

		const { results } = await response.json();

		await onSendResults(results);
		if (!gtoSessionId) {
			onGameEnd();
		}
	}

	$effect(() => {
		// Register the "Автопрохождение" banner button only for known tests in
		// DEV mode. The cleanup resets it on unmount/slug change so the button
		// never leaks to about/results pages. Offline tolerance: isDevMode
		// undefined → no registration, no errors.
		if (data.isDevMode && test) {
			if (headerContext) {
				headerContext.devAction = { label: 'Автопрохождение', onclick: runAutoplay };
			}
		}
		return () => {
			if (headerContext) {
				headerContext.devAction = null;
			}
		};
	});

	function onGameEnd() {
		isGameEnd = true;
		// In GTO mode, navigation is handled by onSendResults after saving
		if (!gtoSessionId) {
			goto(resolve(`/tests/${slug}/results`));
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
				// Navigate to next test's about page in GTO sequence
				goto(result.nextTestUrl);
			} else {
				// All tests done — go to words page
				goto(resolve(`/gto/session/${gtoSessionId}/words`));
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
	<main class="main flex flex-col items-center justify-evenly text-[--main-text-color]">
		<Component gameEnd={onGameEnd} sendResults={onSendResults} {data}></Component>
	</main>

	{#if isGameEnd}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto={backUrl}>Назад</Button>
			{#if gtoSessionId}
				<Button color="blue" goto="/gto">К сессиям ГТО</Button>
			{:else}
				<Button color="blue" goto={`/tests/${slug}/results`}>Результаты</Button>
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
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={backUrl}>Назад</Button>
		<div></div>
	</section>
{/if}
