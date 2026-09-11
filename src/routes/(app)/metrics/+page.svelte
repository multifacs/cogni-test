<script lang="ts">
	import { translate } from '$lib/utils/common';
	import type { SkillMetric } from '$lib/types';

	let { data } = $props();

	let entries = $derived(Object.entries(data.metricScores) as [SkillMetric, number][]);
</script>

<main class="main mx-auto flex w-full max-w-5xl flex-col items-center justify-center-safe gap-2">
	<p class="w-full text-center text-lg max-md:text-sm">
		Результаты по метрикам обновляются по мере прохождения тестов и упражнений.
	</p>
	<table class="w-full border-collapse rounded-2xl bg-white text-left text-sm">
		<thead>
			<tr class="border-b border-gray-200 text-gray-600">
				<th scope="col" class="px-4 py-2 font-medium">Метрика</th>
				<th scope="col" class="px-4 py-2 text-right font-semibold text-gray-800">Уровень</th
				>
			</tr>
		</thead>
		<tbody>
			{#each entries as [metric, score] (metric)}
				<tr class="border-b border-gray-100 last:border-b-0">
					<th scope="row" class="px-4 py-2 font-medium text-gray-600"
						>{translate(metric)}</th
					>
					<td class="px-4 py-2 text-right text-gray-800">
						<span
							class="text-xl font-bold"
							class:text-red-400={score < 30}
							class:text-yellow-300={score >= 30 && score < 70}
							class:text-green-400={score >= 70}
						>
							{score}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>
