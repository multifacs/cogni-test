<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import type { ExerciseResultMap } from '$lib/exercises/types.js';
	import { exerciseRegistry } from '$lib/exercises';
	import { mergeSessions, type ResultsPageSession } from '$lib/results';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import { getPendingAttempts, flushQueue, type QueueElement } from '$lib/client/offline-queue';
	import { type Component } from 'svelte';

	const { data } = $props();
	const slug = $derived(data.slug);
	const serverResults = $derived(data.results as ResultsPageSession[]);

	const exercise = $derived(exerciseRegistry[slug]);
	let Comp: Component | null = $state(null);
	let SummaryComp: Component | null = $state(null);

	let pending = $state<QueueElement[]>([]);
	const mergedResults = $derived(mergeSessions(serverResults, pending));

	$effect(() => {
		Comp = null;
		if (exercise?.result) {
			exercise.result().then((mod) => {
				Comp = mod.default as Component;
			});
		}
	});

	$effect(() => {
		SummaryComp = null;
		if (exercise?.summary) {
			exercise.summary().then((mod) => {
				SummaryComp = mod.default as Component;
			});
		}
	});

	onMount(() => {
		async function mergePending() {
			pending = await getPendingAttempts(slug, 'exercise');
			if (pending.length === 0) return;
			// Race with the layout-level flush is accepted: the server is
			// idempotent by sessionId, and flushQueue's re-read + done-set
			// prevents losing concurrently enqueued elements.
			flushQueue()
				.then((s) => {
					if (s.flushed > 0) invalidateAll();
				})
				.catch(() => {});
		}
		mergePending();
	});

	// null — авто (первая попытка); иначе — явный выбор пользователя для этого slug
	let choice = $state<{ slug: string; id: string | null } | null>(null);

	const openedSessionId = $derived(
		choice && choice.slug === slug ? choice.id : (mergedResults[0]?.sessionId ?? null)
	);

	const toggleSession = (sessionId: string) => {
		choice = { slug, id: openedSessionId === sessionId ? null : sessionId };
	};

	function parseMeta(meta: unknown): Record<string, string> | null {
		if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
			return meta as Record<string, string>;
		}
		return null;
	}

	function difficultyLabel(key: string): string {
		if (key === 'easy') return 'Легкий';
		if (key === 'medium') return 'Средний';
		if (key === 'hard') return 'Сложный';
		return key;
	}
</script>

<main class="main mx-auto flex w-full max-w-5xl flex-col items-center justify-center-safe gap-2">
	{#if SummaryComp}
		<div class="w-full">
			<!-- Intentionally server-only data (trust model: server = source of truth) -->
			<SummaryComp results={serverResults} />
		</div>
	{/if}

	{#if mergedResults.length > 0}
		{#each mergedResults as result (result.sessionId)}
			{@const meta = parseMeta(result.meta)}
			<div class="w-full rounded-2xl bg-white shadow">
				<button
					class={`flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-4 py-3 transition-colors hover:bg-gray-100 ${openedSessionId !== result.sessionId ? 'hover:rounded-b-2xl' : ''}`}
					onclick={() => toggleSession(result.sessionId)}
				>
					<span class="flex items-center gap-2 font-medium">
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
						<span>
							{openedSessionId === result.sessionId
								? 'Попытка от ' + formatUserLocalDate(result.createdAt)
								: formatUserLocalDate(result.createdAt)}
						</span>
						{#if meta?.difficulty}
							<span
								class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {meta.difficulty ===
								'hard'
									? 'bg-red-100 text-red-700'
									: meta.difficulty === 'medium'
										? 'bg-amber-100 text-amber-700'
										: 'bg-green-100 text-green-700'}"
							>
								{difficultyLabel(meta.difficulty)}
							</span>
						{/if}
					</span>
					<svg
						class={`h-5 w-5 transform text-gray-500 transition-transform ${openedSessionId === result.sessionId ? 'rotate-180' : ''}`}
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
							exerciseType={slug as keyof ExerciseResultMap}
							results={result.attempts}
							meta={result.meta}
						/>
					</div>
				{/if}
			</div>
		{/each}
	{:else}
		<h1 class="text-center">Попыток нет</h1>
	{/if}
</main>

<section class="low-content grid w-full grid-cols-2 gap-4 sm:max-w-5xl">
	<Button color="red" goto="/exercises/{slug}">Назад</Button>
	<Button color="blue" goto="/exercises/{slug}/playground">Пройти снова</Button>
</section>
