<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { RavenAttemptRow } from './types';
	import { formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	const rows = results as RavenAttemptRow[];
	const s = summary(rows);
</script>

<div class="grid grid-cols-3 gap-2 py-2 sm:gap-4">
	<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Верно</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalQuestions}</strong>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.totalQuestions ? Math.round(s.accuracy * 100) : 0}%</strong
		>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Среднее время</span>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
</div>

<ResultsChart attempts={rows} />
