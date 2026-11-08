<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { RotationAttemptRow } from './results-adapter';
	import { formatMs, summary } from './results-adapter';

	// exerciseType передаётся generic-страницей результатов, но здесь не нужен;
	// в деструктуризацию не включаем, чтобы не таскать неиспользуемый проп.
	let { results }: { results: RotationAttemptRow[] } = $props();

	const s = $derived(summary(results));
	const difficultyLabel: Record<number, string> = {
		1: '1 (3×3)',
		2: '2 (4×4)',
		3: '3 (6×6)'
	};
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
		<span class="mb-1 block text-center text-xs opacity-70 sm:mb-2 sm:text-sm">Таймауты</span>
		<strong class="text-base sm:text-2xl">{s.timeouts}</strong>
	</div>
</div>

<div class="grid grid-cols-3 gap-2 py-2 sm:gap-4">
	<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-3">
		<span class="block text-xs opacity-70 sm:text-sm">Лёгкий (3×3)</span>
		<strong class="text-sm sm:text-lg"
			>{s.perDifficulty.easy.correct}/{s.perDifficulty.easy.total} ·
			{s.perDifficulty.easy.accuracy}%</strong
		>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-3">
		<span class="block text-xs opacity-70 sm:text-sm">Средний (4×4)</span>
		<strong class="text-sm sm:text-lg"
			>{s.perDifficulty.medium.correct}/{s.perDifficulty.medium.total} ·
			{s.perDifficulty.medium.accuracy}%</strong
		>
	</div>
	<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-3">
		<span class="block text-xs opacity-70 sm:text-sm">Сложный (6×6)</span>
		<strong class="text-sm sm:text-lg"
			>{s.perDifficulty.hard.correct}/{s.perDifficulty.hard.total} ·
			{s.perDifficulty.hard.accuracy}%</strong
		>
	</div>
</div>

<ResultsChart attempts={results} />

<div class="overflow-x-auto py-2">
	<table class="w-full text-left text-sm sm:text-base">
		<thead>
			<tr class="text-xs opacity-70 sm:text-sm">
				<th class="px-2 py-1">№</th>
				<th class="px-2 py-1">Уровень</th>
				<th class="px-2 py-1">Сетка</th>
				<th class="px-2 py-1">Ответ</th>
				<th class="px-2 py-1">Время</th>
			</tr>
		</thead>
		<tbody>
			{#each results as row (row.taskIndex)}
				<tr class={row.isCorrect ? '' : 'text-[#e06c75]'}>
					<td class="px-2 py-1">{row.taskIndex}</td>
					<td class="px-2 py-1"
						>{difficultyLabel[row.difficultyLevel] ?? row.difficultyLevel}</td
					>
					<td class="px-2 py-1">{row.gridSize}×{row.gridSize}</td>
					<td class="px-2 py-1">
						{row.isCorrect ? '✓' : '✗'}
						{#if row.timedOut}<span class="ml-1 text-xs opacity-70">(таймаут)</span
							>{/if}
					</td>
					<td class="px-2 py-1">{formatMs(row.responseTimeMs)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
