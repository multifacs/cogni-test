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

	function durationLabel(seconds: number): string {
		if (seconds >= 3600) return (seconds / 3600).toFixed(0) + ' ч';
		if (seconds >= 60) return (seconds / 60).toFixed(0) + ' мин';
		return seconds + ' с';
	}
</script>

{#if results.length > 0}
	{@const first = results[0] as WordMorphingSummaryRow}
	<div class="grid grid-cols-3 gap-2 py-2 sm:gap-4">
		<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
			<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Категория</span>
			<strong class="text-base sm:text-2xl"
				>{first.category === 'words' ? 'Слова' : 'Фигуры'}</strong
			>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
			<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Интервал</span>
			<strong class="text-base sm:text-2xl">{durationLabel(first.durationSeconds)}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
			<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Исходное сочетание</span>
			<strong class="text-sm sm:text-xl">{first.originalCombo}</strong>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl bg-[#364b6c] text-white">
		<div
			class="grid grid-cols-[1fr_1fr_auto] gap-x-2 px-2 py-1.5 text-xs opacity-70 border-b border-white/10 sm:gap-x-4 sm:px-4 sm:py-2 sm:text-sm"
		>
			<span>Ожидается</span>
			<span>Ваш ответ</span>
			<span></span>
		</div>
		{#each results as attempt_raw, i (i)}
			{@const attempt = attempt_raw as WordMorphingSummaryRow}
			<div
				class="grid grid-cols-[1fr_1fr_auto] gap-x-2 px-2 py-1.5 text-sm items-center sm:gap-x-4 sm:px-4 sm:py-2.5 {i <
				results.length - 1
					? 'border-b border-white/10'
					: ''}"
			>
				<span>{attempt.expectedCombo}</span>
				{#if attempt.recalledCombo}
					<span class={attempt.isCorrect ? 'text-green-400' : 'text-red-400'}>
						{attempt.recalledCombo}
					</span>
				{:else}
					<span class="italic opacity-50">(не введено)</span>
				{/if}
				<span class="text-base sm:text-lg">{attempt.isCorrect ? '✓' : '✗'}</span>
			</div>
		{/each}
	</div>
{/if}
