<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { testRegistry } from '$lib/tests';
	import { page } from '$app/state';
	import { isStreamingActive } from '$lib/stores/streaming.svelte';
	import { withFromAi } from '$lib/ai/flow';

	const { data } = $props();
	const slug = $derived(data.slug);
	const test = $derived(testRegistry[slug]);

	import type { Component as ComponentType } from 'svelte';
	let Component = $state<ComponentType | null>(null);

	// GTO session integration
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	// Streaming (runAll) mode: «Назад» ведёт на /home — выход из серии
	// без остановки стрима: очередь живёт в streaming-store, и возврат
	// на /tests продолжит серию. В GTO-сессии «Назад» ведёт на /gto.
	const isStreaming = $derived(isStreamingActive() && !gtoSessionId);

	// Единая цель «Назад»: в потоковом режиме — /home, иначе /gto (GTO-сессия)
	// или /tests (обычный запуск).
	const backTarget = $derived(
		withFromAi(isStreaming ? '/home' : gtoSessionId ? '/gto' : '/tests', page.url)
	);

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
		withFromAi(
			(gtoSessionId
				? `/tests/${slug}/playground?gtoSessionId=${gtoSessionId}`
				: `/tests/${slug}/playground`) satisfies PathnameWithSearchOrHash,
			page.url
		)
	);
</script>

{#if Component}
	<main class="main flex w-full flex-col items-center justify-center-safe text-justify">
		<Card className="w-full max-w-5xl">
			<Component></Component>
		</Card>
	</main>

	<section class="low-content grid {gtoSessionId ? 'grid-cols-2' : 'grid-cols-3'} gap-4">
		<Button color="red" goto={backTarget}>Назад</Button>
		<Button color="green" goto={playgroundUrl}>Начать</Button>
		{#if !gtoSessionId}
			<Button color="blue" goto={withFromAi(`/tests/${slug}/results`, page.url)}
				>История</Button
			>
		{/if}
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto={backTarget}>Назад</Button>
	</section>
{/if}
