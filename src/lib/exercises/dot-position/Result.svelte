<script lang="ts">
	import type { DotPositionResult } from './types';
	import ResultsChart from './ResultsChart.svelte';

	// exerciseType передаётся generic-страницей результатов, но здесь не нужен;
	// в деструктуризацию не включаем, чтобы не таскать неиспользуемый проп.
	let {
		results,
		meta = null
	}: {
		results: DotPositionResult[];
		meta?: Record<string, string> | null;
	} = $props();

	const total = $derived(results.length);
	const correctCount = $derived(results.filter((r) => r.correct).length);
	const avgReactionMs = $derived(
		total === 0 ? null : results.reduce((a, r) => a + r.reactionMs, 0) / total
	);

	const STAGES = [
		{ stage: 1 as const, label: 'Этап 1 (сетка 5×5)' },
		{ stage: 2 as const, label: 'Этап 2 (сетка 3×3)' },
		{ stage: 3 as const, label: 'Этап 3 (без сетки)' }
	];

	const stageRows = $derived(
		STAGES.map(({ stage, label }) => {
			const rows = results.filter((r) => r.stage === stage);
			if (rows.length === 0) return null;
			const correct = rows.filter((r) => r.correct).length;
			const avgMs = rows.reduce((a, r) => a + r.reactionMs, 0) / rows.length;
			return { label, correct, errors: rows.length - correct, avgMs };
		}).filter((row): row is NonNullable<typeof row> => row !== null)
	);

	// Нетап-раунды (distance === null) в средней точности не участвуют.
	const distances = $derived(
		results.filter((r) => r.distance !== null).map((r) => r.distance as number)
	);
	const avgDistance = $derived(
		distances.length === 0 ? null : distances.reduce((a, d) => a + d, 0) / distances.length
	);

	// Человекочитаемый формат: секунды с десятыми для «медленных» значений,
	// миллисекунды для «быстрых», чтобы не терять точность ниже секунды.
	function formatMs(ms: number): string {
		return ms >= 1000 ? `${(ms / 1000).toFixed(1)} с` : `${Math.round(ms)} мс`;
	}

	const windowText = $derived.by(() => {
		const raw = meta?.windowSize;
		if (raw == null) return '';
		const val = Number(raw);
		if (Number.isNaN(val)) return raw;
		return `${Math.round(val * 100)}%`;
	});
</script>

<div class="flex w-full flex-col items-center gap-2 py-2 text-sm sm:text-base">
	<p class="font-medium">Верно: {correctCount} из {total}</p>
	{#if avgReactionMs !== null}
		<p>Средняя реакция: {formatMs(avgReactionMs)}</p>
	{/if}
	{#if windowText}
		<p>Окно попадания: {windowText}</p>
	{/if}
	{#if avgDistance !== null}
		<p>Среднее отклонение тапа: {avgDistance.toFixed(2)}</p>
	{/if}

	{#if stageRows.length > 0}
		<table class="w-full max-w-md border-collapse text-left">
			<thead>
				<tr class="border-b border-gray-300 text-gray-500">
					<th class="py-1 pr-2 font-medium">Этап</th>
					<th class="py-1 pr-2 font-medium">Верно</th>
					<th class="py-1 pr-2 font-medium">Ошибок</th>
					<th class="py-1 font-medium">Ср. реакция</th>
				</tr>
			</thead>
			<tbody>
				{#each stageRows as row (row.label)}
					<tr class="border-b border-gray-200 last:border-0">
						<td class="py-1 pr-2">{row.label}</td>
						<td class="py-1 pr-2">{row.correct}</td>
						<td class="py-1 pr-2">{row.errors}</td>
						<td class="py-1">{formatMs(row.avgMs)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<ResultsChart {results} />
</div>
