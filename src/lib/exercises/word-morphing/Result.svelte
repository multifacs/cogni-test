<script lang="ts">
	import type { WordMorphingSummaryRow } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ExerciseResults;
		exerciseType?: string;
		meta?: string[];
	} = $props();

	function accuracyLabel(row: WordMorphingSummaryRow): string {
		if (row.totalCombos === 0) return '—';
		return Math.round((row.correctCount / row.totalCombos) * 100) + '%';
	}
</script>

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as WordMorphingSummaryRow}
	<div class="grid grid-cols-2 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Верно</span>
			<strong class="text-2xl">{attempt.correctCount} / {attempt.totalCombos}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Точность</span>
			<strong class="text-2xl">{accuracyLabel(attempt)}</strong>
		</div>
	</div>
	<div class="grid grid-cols-2 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Категория</span>
			<strong class="text-2xl">{attempt.category === 'words' ? 'Слова' : 'Фигуры'}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Интервал</span>
			<strong class="text-2xl"
				>{attempt.durationSeconds >= 60
					? attempt.durationSeconds >= 3600
						? (attempt.durationSeconds / 3600).toFixed(0) + ' ч'
						: (attempt.durationSeconds / 60).toFixed(0) + ' мин'
					: attempt.durationSeconds + ' с'}</strong
			>
		</div>
	</div>
{/each}
