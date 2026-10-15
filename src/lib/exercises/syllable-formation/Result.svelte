<script lang="ts">
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { SyllableFormationAttemptRow } from './types';

	let {
		results
	}: {
		results: ExerciseResults;
	} = $props();

	// Тип ещё не зарегистрирован в объединении ExerciseResults (Task 1.3),
	// поэтому двойное приведение.
	const rows = $derived(results as unknown as SyllableFormationAttemptRow[]);

	const total = $derived(rows.length);
	const correctCount = $derived(rows.filter((r) => r.isCorrect).length);
	const timeoutCount = $derived(rows.filter((r) => r.timedOut).length);
	// Среднее — только по строкам с фактическим ответом; без ответов — «—».
	const answeredRows = $derived(rows.filter((r) => !r.timedOut));
	const averageReactionMs = $derived(
		answeredRows.length
			? Math.round(
					answeredRows.reduce((sum, r) => sum + r.reactionTimeMs, 0) / answeredRows.length
				)
			: null
	);

	/** Копия formatMs из rotation/results-adapter.ts (локальная, без импорта). */
	function formatMs(ms: number): string {
		if (!Number.isFinite(ms)) return '—';
		if (ms < 1000) return `${Math.round(ms)} мс`;
		return `${(ms / 1000).toFixed(1)} с`;
	}
</script>

{#if total > 0}
	<div class="grid grid-cols-3 gap-2 bg-white py-2 sm:gap-4">
		<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
			<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Верно</span>
			<strong class="text-base sm:text-2xl">{correctCount} из {total}</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
			<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm"
				>Среднее время ответа</span
			>
			<strong class="text-base sm:text-2xl">
				{averageReactionMs === null ? '—' : formatMs(averageReactionMs)}
			</strong>
		</div>
		<div class="rounded-2xl bg-[#364b6c] p-2 text-center text-white sm:p-4">
			<span class="mb-1 block text-xs opacity-70 sm:mb-2 sm:text-sm">Таймауты</span>
			<strong class="text-base sm:text-2xl">{timeoutCount}</strong>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl bg-[#364b6c] text-white">
		<div
			class="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-2 border-b border-white/10 px-2 py-1.5 text-xs opacity-70 sm:gap-x-4 sm:px-4 sm:py-2 sm:text-sm"
		>
			<span>№</span>
			<span>Сочетание</span>
			<span>Ассоциация</span>
			<span>Ваш ответ</span>
			<span></span>
		</div>
		{#each rows as row, i (i)}
			<div
				data-testid="result-row"
				class="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-x-2 px-2 py-1.5 text-sm sm:gap-x-4 sm:px-4 sm:py-2.5 {i <
				total - 1
					? 'border-b border-white/10'
					: ''}"
			>
				<span class="opacity-70">{row.pairIndex}</span>
				<span>{row.phrase}</span>
				{#if row.association !== null}
					<span class="opacity-90">{row.association}</span>
				{:else}
					<span class="italic opacity-50">(нет ассоциации)</span>
				{/if}
				{#if row.timedOut}
					<span data-testid="result-answer" class="italic opacity-50">(время вышло)</span>
				{:else if row.recalledPhrase}
					<span
						data-testid="result-answer"
						class={row.isCorrect ? 'text-green-400' : 'text-red-400'}
					>
						{row.recalledPhrase}
					</span>
				{:else}
					<span data-testid="result-answer" class="italic opacity-50">(не введено)</span>
				{/if}
				<span class="text-base sm:text-lg">{row.isCorrect ? '✓' : '✗'}</span>
			</div>
		{/each}
	</div>
{/if}
