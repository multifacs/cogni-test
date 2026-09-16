<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PathnameWithSearchOrHash, ResolvedPathname } from '$app/types';

	const resolvePathname = resolve as (path: PathnameWithSearchOrHash) => ResolvedPathname;
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import { getContext, onMount } from 'svelte';
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';
	import { streaming, startStreaming } from '$lib/stores/streaming.svelte';

	let { data } = $props();

	let testSessionCounts: Record<string, number> = $state(data.testSessionCounts ?? {});
	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) {
			headerContext.value = 'Диагностика';
		}

		// Заход с home (requestStreamingStart) — материализуем очередь из data
		if (streaming.pendingStart) {
			startStreaming(data.tests, data.testSessionCounts ?? {});
		}

		// Живая очередь — сразу уходим к первому тесту (пилюлю рендерит Header)
		if (streaming.queue.length > 0) {
			goto(resolvePathname(streaming.queue[0].path as PathnameWithSearchOrHash));
		}
	});

	function handleStartStreaming() {
		startStreaming(data.tests, data.testSessionCounts ?? {});
		if (streaming.queue.length > 0) {
			goto(resolvePathname(streaming.queue[0].path as PathnameWithSearchOrHash));
		}
	}
</script>

<main class="main flex w-full flex-col items-center justify-center-safe">
	<div class="flex w-full max-w-5xl flex-col items-center justify-center-safe gap-4 sm:gap-6">
		<div class="w-full">
			<RecommendationCard
				title="Запуск потокового прохождения"
				text="Регулярные тренировки помогают поддерживать когнитивные навыки"
				icon="/brain.svg"
				goto="/tests"
				variant="card"
				button_text="Начать прохождение"
				onclick={handleStartStreaming}
			/>
		</div>

		<div
			class="grid w-full grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-6"
		>
			{#each data.tests as { name, title, path, img } (title)}
				<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
			{/each}
		</div>
	</div>
</main>
