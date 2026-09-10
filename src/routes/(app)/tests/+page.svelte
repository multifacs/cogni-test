<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PathnameWithSearchOrHash, ResolvedPathname } from '$app/types';

	const resolvePathname = resolve as (path: PathnameWithSearchOrHash) => ResolvedPathname;
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import localforage from 'localforage';
	import { getContext, onMount } from 'svelte';
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';
	import { getStreamingQueue } from '$lib/shared/testQueue.js';

	let { data } = $props();

	let testSessionCounts: Record<string, number> = $state(data.testSessionCounts ?? {});
	let runAllMode = $state(true);
	const headerContext = getContext<{ value: string }>('headerText');

	onMount(async () => {
		if (headerContext) {
			headerContext.value = 'Диагностика';
		}

		const flag = await localforage.getItem('runAllMode');
		if (flag && data.tests.length > 0) {
			const uncompleted = data.tests.filter((t) => {
				const count = testSessionCounts[t.name];
				return count == null || count < 1;
			});
			if (uncompleted.length > 0) {
				goto(resolvePathname(uncompleted[0].path as PathnameWithSearchOrHash) as string);
			} else {
				localforage.setItem('runAllMode', false);
				goto(resolvePathname('/home' as PathnameWithSearchOrHash) as string);
			}
		} else {
			runAllMode = false;
		}
	});

	async function startStreaming() {
		await localforage.setItem('runAllMode', true);
		const queue = getStreamingQueue(data.tests, testSessionCounts);
		if (queue.length > 0) {
			goto(resolvePathname(queue[0].path as PathnameWithSearchOrHash) as string);
		}
	}
</script>

<main class="main flex w-full flex-col items-center justify-center-safe">
	<div class="flex w-full max-w-5xl flex-col items-center justify-center-safe gap-4 sm:gap-12">
		{#if runAllMode}
			<Spinner></Spinner>
		{:else}
			<div class="w-fill">
				<RecommendationCard
					title="Запуск потокового прохождения"
					text="Регулярные тренировки помогают поддерживать когнитивные навыки"
					icon="/brain.svg"
					goto="/tests"
					variant="card"
					button_text="Начать прохождение"
					onclick={startStreaming}
				/>
			</div>

			<div class="flex flex-wrap justify-around gap-6 sm:justify-center">
				{#each data.tests as { name, title, path, img } (title)}
					<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
				{/each}
			</div>
		{/if}
	</div>
</main>
