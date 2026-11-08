<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { OrigamiAttemptRow } from './types';
	import { difficultyLabel, formatMs, summary } from './results-adapter';

	let { results }: { results: ExerciseResults } = $props();

	const rows = $derived(results as OrigamiAttemptRow[]);
	const s = $derived(summary(rows));
	const tableRows = $derived(
		rows.map((answer, index) => ({
			index: index + 1,
			difficulty: difficultyLabel(answer.difficulty),
			isCorrect: answer.isCorrect,
			responseTimeMs: answer.responseTimeMs
		}))
	);
</script>

<div class="grid grid-cols-2 gap-2 py-2 sm:grid-cols-4 sm:gap-4">
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Верно</span>
		<strong class="text-base sm:text-2xl">{s.correctCount}/{s.totalQuestions}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Точность</span>
		<strong class="text-base sm:text-2xl"
			>{s.totalQuestions ? Math.round(s.accuracy * 100) : 0}%</strong
		>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-center text-xs opacity-70 sm:mb-2 sm:text-sm"
			>Среднее время</span
		>
		<strong class="text-base sm:text-2xl">{formatMs(s.averageResponseTimeMs)}</strong>
	</div>
	<div
		class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-white sm:p-4"
	>
		<span class="mb-1 block text-center text-xs opacity-70 sm:mb-2 sm:text-sm">Общее время</span
		>
		<strong class="text-base sm:text-2xl">{formatMs(s.totalDurationMs)}</strong>
	</div>
</div>

<!-- Точность по сложности -->
<div class="flex flex-wrap justify-center gap-2 py-2">
	{#each s.byDifficulty as d (d.difficulty)}
		{#if d.total > 0}
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-300/20 sm:text-sm"
			>
				{difficultyLabel(d.difficulty)}: {d.correct}/{d.total}
				({Math.round(d.accuracy * 100)}%)
			</span>
		{/if}
	{/each}
</div>

<!-- Компактная таблица попыток -->
<div class="overflow-x-auto py-2">
	<table class="mx-auto w-full max-w-md border-collapse text-sm">
		<thead>
			<tr class="text-left text-xs text-slate-500 uppercase">
				<th class="px-2 py-1.5">Задание</th>
				<th class="px-2 py-1.5">Сложность</th>
				<th class="px-2 py-1.5">Результат</th>
				<th class="px-2 py-1.5 text-right">Время</th>
			</tr>
		</thead>
		<tbody>
			{#each tableRows as row (row.index)}
				<tr class="border-t border-slate-200/60">
					<td class="px-2 py-1.5 tabular-nums">{row.index}</td>
					<td class="px-2 py-1.5">{row.difficulty}</td>
					<td class="px-2 py-1.5">
						{#if row.isCorrect}
							<span class="text-emerald-600">Верно</span>
						{:else}
							<span class="text-red-500">Ошибка</span>
						{/if}
					</td>
					<td class="px-2 py-1.5 text-right tabular-nums"
						>{formatMs(row.responseTimeMs)}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<ResultsChart attempts={rows} />
