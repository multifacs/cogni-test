<script lang="ts">
	import { translate } from '$lib/utils/common';
	import type { SkillMetric } from '$lib/types';

	let { data } = $props();

	let entries = $derived(Object.entries(data.metricScores) as [SkillMetric, number][]);
</script>

<section class="banner">
	<h1 class="text-3xl font-bold text-center">Метрики</h1>
</section>
<main class="main flex flex-col gap-3">
	<div class="flex w-full flex-col gap-3">
		{#each entries as [metric, score]}
			<div class="flex items-center justify-between rounded-2xl bg-gray-600 p-4 shadow">
				<span class="text-lg">{translate(metric)}</span>
				<span
					class="text-xl font-bold"
					class:text-red-400={score < 30}
					class:text-yellow-300={score >= 30 && score < 70}
					class:text-green-400={score >= 70}
				>
					{score}
				</span>
			</div>
		{/each}
	</div>
</main>
<section class="low-content flex items-center justify-center text-center">
	<p class="max-w-md text-center text-lg max-md:text-sm">
		Результаты по метрикам обновляются по мере прохождения тестов и упражнений.
	</p>
</section>
