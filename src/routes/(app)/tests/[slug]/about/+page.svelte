<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StreamingBadge from '$lib/components/ui/StreamingBadge.svelte';
	import { testRegistry } from '$lib/tests';
	import { page } from '$app/state';

	const { data } = $props();
	const slug = $derived(data.slug);
	const test = $derived(testRegistry[slug]);

	import type { Component as ComponentType } from 'svelte';
	import { onMount } from 'svelte';
	import localforage from 'localforage';
	let Component = $state<ComponentType | null>(null);

	// GTO session integration
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	// Streaming (runAll) mode: «Назад» ведёт на /tests, чей bounce-механизм
	// мгновенно возвращает на этот же тест — кнопка выглядит «зависшей».
	// В GTO-сессии «Назад» реально работает, поэтому там кнопка активна.
	// Флаг управляет и disabled «Назад», и индикатором StreamingBadge:
	// GTO не использует runAllMode — там кнопка активна и бейджа нет.
	let runAllMode = $state(false);
	const isStreaming = $derived(runAllMode && !gtoSessionId);

	onMount(async () => {
		const mode = await localforage.getItem('runAllMode');
		if (typeof mode === 'boolean') {
			runAllMode = mode;
		}
	});

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

<!-- Бейдж стриминга: определён один раз (сниппет), рендерится первым
     элементом main в обеих ветках (resolved и Spinner). Сиблинг над веткой
     {#if Component} нельзя: (app)-layout — это grid с grid-template-areas
     (banner/main/low-content/nav); непомещённый элемент попал бы в
     implicit-ряд и сломал бы 100dvh-раскладку. Внутри main бейдж в потоке
     контента, по центру (main — flex flex-col items-center) — layout-риска нет. -->
{#snippet streamingIndicator()}
	{#if isStreaming}<StreamingBadge />{/if}
{/snippet}

{#if Component}
	<main class="main flex w-full flex-col items-center justify-center-safe text-justify">
		{@render streamingIndicator()}
		<Card className="w-full max-w-5xl">
			<Component></Component>
		</Card>
	</main>

	<section class="low-content grid {gtoSessionId ? 'grid-cols-2' : 'grid-cols-3'} gap-4">
		<Button color="red" goto={gtoSessionId ? '/gto' : '/tests'} disabled={isStreaming}
			>Назад</Button
		>
		<Button color="green" goto={playgroundUrl}>Начать</Button>
		{#if !gtoSessionId}
			<Button color="blue" goto={`/tests/${slug}/results`}>История</Button>
		{/if}
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		{@render streamingIndicator()}
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto={gtoSessionId ? '/gto' : '/tests'} disabled={isStreaming}
			>Назад</Button
		>
	</section>
{/if}
