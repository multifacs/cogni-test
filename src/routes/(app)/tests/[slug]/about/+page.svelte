<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { testRegistry } from '$lib/tests';
	import { page } from '$app/state';
	import { isStreamingActive } from '$lib/stores/streaming.svelte';

	const { data } = $props();
	const slug = $derived(data.slug);
	const test = $derived(testRegistry[slug]);

	import type { Component as ComponentType } from 'svelte';
	let Component = $state<ComponentType | null>(null);

	// GTO session integration
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	// Streaming (runAll) mode: «Назад» ведёт на /tests, чей bounce-механизм
	// мгновенно возвращает на этот же тест — кнопка выглядит «зависшей».
	// В GTO-сессии «Назад» реально работает, поэтому там кнопка активна.
	// Очередь живёт в streaming-store; GTO его не использует — там кнопка активна.
	const isStreaming = $derived(isStreamingActive() && !gtoSessionId);

	$effect(() => {
		Component = null;
		if (test) {
			test.about().then((mod) => {
				Component = mod.default;
			});
		}
	});

	import type { PathnameWithSearchOrHash } from '$app/types';
	import Card from '$lib/components/ui/Card.svelte';

	const playgroundUrl = $derived(
		(gtoSessionId
			? `/tests/${slug}/playground?gtoSessionId=${gtoSessionId}`
			: `/tests/${slug}/playground`) satisfies PathnameWithSearchOrHash
	);
</script>

{#if Component}
	<main class="main flex w-full flex-col items-center justify-center-safe text-justify">
		<Card className="w-full max-w-5xl">
			<Component></Component>
		</Card>
	</main>

	<section class="low-content grid {gtoSessionId ? 'grid-cols-2' : 'grid-cols-3'} gap-4">
		<Button color="red" goto={isStreaming ? '/home' : gtoSessionId ? '/gto' : '/tests'}
			>Назад</Button
		>
		<Button color="green" goto={playgroundUrl}>Начать</Button>
		{#if !gtoSessionId}
			<Button color="blue" goto={`/tests/${slug}/results`}>История</Button>
		{/if}
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto={isStreaming ? '/home' : gtoSessionId ? '/gto' : '/tests'}
			>Назад</Button
		>
	</section>
{/if}
