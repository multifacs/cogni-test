<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { TestResultMap } from '$lib/tests/types.js';
	import { testRegistry } from '$lib/tests';
	import { mergeSessions, type ResultsPageSession } from '$lib/results';
	import { formatUserLocalDate } from '$lib/utils/index.js';
	import { getPendingAttempts, flushQueue, type QueueElement } from '$lib/client/offline-queue';
	import { invalidateAll } from '$app/navigation';
	import { onMount, type Component } from 'svelte';
	import localforage from 'localforage';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	const { data } = $props();
	const slug = $derived(data.slug);
	// Loading state (Spinner) смотрит на серверные данные — пока их нет,
	// показываем загрузку, даже если очередь уже принесла pending-попытки
	const results = $derived(data.results as ResultsPageSession[] | null | undefined);
	const serverResults = $derived(results ?? []);
	const test = $derived(testRegistry[slug]);
	let Comp: Component | null = $state(null);

	let pending = $state<QueueElement[]>([]);
	const mergedResults = $derived(mergeSessions(serverResults, pending));

	let runAllMode = $state(false);

	// Зависит только от test/slug: НЕ должен реагировать на mergedResults,
	// иначе каждое обновление pending-очереди перегружало бы график
	$effect(() => {
		Comp = null;
		if (test?.resultsChart) {
			test.resultsChart()
				.then((mod) => {
					Comp = mod.default as Component;
				})
				.catch(async () => {
					const resultsChart = (
						await import('$lib/components/charts/ResultsChart.svelte')
					).default;
					Comp = resultsChart as Component;
				});
		} else {
			import('$lib/components/charts/ResultsChart.svelte').then((mod) => {
				Comp = mod.default as Component;
			});
		}
	});

	onMount(async () => {
		try {
			const mode = await localforage.getItem('runAllMode');
			if (typeof mode === 'boolean') {
				runAllMode = mode;
			}
		} catch (err) {
			console.log(err);
		}

		pending = await getPendingAttempts(slug, 'test');
		if (pending.length > 0) {
			// Гонка с layout-flush принята: сервер идемпотентен по sessionId,
			// а done-set внутри flushQueue не теряет параллельно
			// поставленные в очередь элементы.
			flushQueue()
				.then((s) => {
					if (s.flushed > 0) invalidateAll();
				})
				.catch(() => {});
		}
	});

	// null — авто (первая попытка); иначе — явный выбор пользователя для этого slug
	let choice = $state<{ slug: string; id: string | null } | null>(null);

	const openedSessionId = $derived(
		choice && choice.slug === slug ? choice.id : (mergedResults[0]?.sessionId ?? null)
	);

	const toggleSession = (sessionId: string) => {
		choice = { slug, id: openedSessionId === sessionId ? null : sessionId };
	};
</script>

<main class="main mx-auto flex w-full max-w-5xl flex-col items-center justify-center-safe gap-2">
	{#if !results}
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	{:else if mergedResults.length != 0}
		{#each mergedResults as result (result.sessionId)}
			<Card className="w-full p-1!">
				<button
					class={`flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-4 py-3 transition-colors hover:bg-gray-100 ${openedSessionId != result.sessionId ? 'hover:rounded-b-2xl' : ''}`}
					onclick={() => toggleSession(result.sessionId)}
				>
					<span class="text-var(--main-text-color) flex items-center gap-2 font-medium">
						{#if result.pending}
							<span
								class="inline-block h-2.5 w-2.5 rounded-full bg-red-500"
								title="Ожидает загрузки"
								aria-label="Ожидает загрузки"
							></span>
						{:else}
							<span
								class="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
								title="Загружено"
								aria-label="Загружено"
							></span>
						{/if}
						{openedSessionId === result.sessionId
							? 'Попытка от ' + formatUserLocalDate(result.createdAt)
							: formatUserLocalDate(result.createdAt)}
					</span>
					<svg
						class={`h-5 w-5 transform text-gray-500 transition-transform ${
							openedSessionId === result.sessionId ? 'rotate-180' : ''
						}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				{#if openedSessionId === result.sessionId && Comp}
					<div class="box-border flex flex-col items-center border-t p-2">
						<Comp
							testType={slug as keyof TestResultMap}
							results={result.attempts}
							meta={'meta' in result ? result['meta'] : undefined}
						/>
					</div>
				{/if}
			</Card>
		{/each}
	{:else}
		<h1 class="text-center">Попыток нет</h1>
	{/if}
</main>

<section class="low-content grid grid-cols-2 gap-4">
	<Button color="red" goto="/tests">{runAllMode ? 'К следующему' : 'К тестам'}</Button>
	<Button color="blue" goto={`/tests/${slug}`}>Заново</Button>
</section>

<style>
	.test-container {
		scrollbar-width: none;
	}
</style>
