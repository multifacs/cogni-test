<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { ExerciseResultMap } from '$lib/exercises/types.js';
	import { exerciseRegistry } from '$lib/exercises';
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import { type Component } from 'svelte';

	const { data } = $props();
	const slug = $derived(data.slug);
	const results = $derived(data.results);

	const exercise = $derived(exerciseRegistry[slug]);
	let Comp: Component | null = $state(null);

	$effect(() => {
		Comp = null;
		if (exercise?.result) {
			exercise.result().then((mod) => {
				Comp = mod.default as Component;
			});
		}
	});

	// null — авто (первая попытка); иначе — явный выбор пользователя для этого slug
	let choice = $state<{ slug: string; id: string | null } | null>(null);

	const openedSessionId = $derived(
		choice && choice.slug === slug ? choice.id : (results[0]?.sessionId ?? null)
	);

	const toggleSession = (sessionId: string) => {
		choice = { slug, id: openedSessionId === sessionId ? null : sessionId };
	};
</script>

<main class="main box-border flex min-h-full flex-col gap-2">
	{#if !results}
		<Spinner />
		<p>Загрузка результатов...</p>
	{:else if results.length > 0}
		{#each results as result (result.sessionId)}
			<div class="w-full rounded-2xl bg-white shadow">
				<button
					class={`flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-4 py-3 transition-colors hover:bg-gray-100 ${openedSessionId !== result.sessionId ? 'hover:rounded-b-2xl' : ''}`}
					onclick={() => toggleSession(result.sessionId)}
				>
					<span class="font-medium">
						{openedSessionId === result.sessionId
							? 'Попытка от ' + formatUserLocalDate(result.createdAt)
							: formatUserLocalDate(result.createdAt)}
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
							meta={'meta' in result ? result['meta'] : undefined}
						/>
					</div>
				{/if}
			</div>
		{/each}
	{:else}
		<h1 class="text-center">Попыток нет</h1>
	{/if}
</main>

<section class="low-content grid grid-cols-2 gap-4">
	<Button color="red" goto="/exercises/{slug}">Назад</Button>
	<Button color="blue" goto="/exercises/{slug}/playground">Пройти снова</Button>
</section>
