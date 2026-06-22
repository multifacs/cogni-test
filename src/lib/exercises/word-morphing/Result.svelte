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

{#each results as attempt_raw, i (i)}
	{@const attempt = attempt_raw as WordMorphingSummaryRow}
	<div class="grid grid-cols-2 gap-4 py-2">
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Категория</span>
			<strong class="text-2xl">{attempt.category === 'words' ? 'Слова' : 'Фигуры'}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
			<span class="mb-2 block opacity-70">Интервал</span>
			<strong class="text-2xl">{durationLabel(attempt.durationSeconds)}</strong>
		</div>
	</div>
{/each}

{#if results.length > 0}
	{@const first = results[0] as WordMorphingSummaryRow}
	<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
		<span class="mb-2 block opacity-70">Исходное сочетание</span>
		<strong class="text-xl">{first.originalCombo}</strong>
	</div>

	<div class="flex flex-col gap-2">
		{#each results as attempt_raw, i (i)}
			{@const attempt = attempt_raw as WordMorphingSummaryRow}
			<div class="rounded-2xl bg-[#364b6c] p-4 text-white">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<span class="opacity-70 text-sm">Ожидается:</span>
						<span>{attempt.expectedCombo}</span>
					</div>
					<div class="flex flex-col gap-1 text-right">
						<span class="opacity-70 text-sm">Ваш ответ:</span>
						{#if attempt.recalledCombo}
							<span class={attempt.isCorrect ? 'text-green-400' : 'text-red-400'}>
								{attempt.recalledCombo}
							</span>
						{:else}
							<span class="italic opacity-50">(не введено)</span>
						{/if}
					</div>
					<span class="ml-3 text-lg">{attempt.isCorrect ? '✓' : '✗'}</span>
				</div>
			</div>
		{/each}
	</div>
{/if}
