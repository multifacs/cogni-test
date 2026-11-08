<script lang="ts">
	import type { CorsiBlockResult } from './types';
	import ResultsChart from './ResultsChart.svelte';

	// exerciseType передаётся generic-страницей результатов, но здесь не нужен;
	// в деструктуризацию не включаем, чтобы не таскать неиспользуемый проп.
	let {
		results,
		meta = null
	}: {
		results: CorsiBlockResult[];
		meta?: Record<string, string> | null;
	} = $props();

	const total = $derived(results.length);
	const correctRows = $derived(results.filter((r) => r.isCorrect));
	// Спан — максимальная ВЕРНО воспроизведённая длина; null — ни одного верного.
	const spanLength = $derived(
		correctRows.length === 0 ? null : Math.max(...correctRows.map((r) => r.sequenceLength))
	);
	const maxLength = $derived(
		total === 0 ? null : Math.max(...results.map((r) => r.sequenceLength))
	);
	const avgAnswerMs = $derived(
		total === 0 ? null : results.reduce((a, r) => a + r.answerMs, 0) / total
	);

	// Человекочитаемый формат: секунды с десятыми для «медленных» значений,
	// миллисекунды для «быстрых», чтобы не терять точность ниже секунды.
	function formatMs(ms: number): string {
		return ms >= 1000 ? `${(ms / 1000).toFixed(1)} с` : `${Math.round(ms)} мс`;
	}

	const windowText = $derived.by(() => {
		const raw = meta?.answerTimeoutMs;
		if (raw == null) return '';
		const val = Number(raw);
		if (Number.isNaN(val)) return raw;
		// Окно ответа — круглое число секунд («15 с»), без десятых.
		return val >= 1000 ? `${Math.round(val / 1000)} с` : `${Math.round(val)} мс`;
	});
</script>

<div class="flex w-full flex-col items-center gap-2 py-2 text-sm sm:text-base">
	<div class="w-full max-w-md overflow-x-auto">
		<table class="w-full border-collapse text-left whitespace-nowrap">
			<thead>
				<tr class="border-b border-gray-300 text-gray-500">
					<th class="py-1 pr-2 font-medium">Заходов</th>
					<th class="py-1 pr-2 font-medium">Спан</th>
					<th class="py-1 pr-2 font-medium">Макс. длина</th>
					<th class="py-1 pr-2 font-medium">Верно / ошибок</th>
					<th class="py-1 pr-2 font-medium">Среднее время</th>
					<th class="py-1 pr-2 font-medium">Окно ответа</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b border-gray-200 last:border-0">
					<td class="py-1 pr-2">{total}</td>
					<td class="py-1 pr-2">{spanLength ?? '—'}</td>
					<td class="py-1 pr-2">{maxLength ?? '—'}</td>
					<td class="py-1 pr-2">{correctRows.length} / {total - correctRows.length}</td>
					<td class="py-1 pr-2">
						{#if avgAnswerMs !== null}
							{formatMs(avgAnswerMs)}
						{/if}
					</td>
					<td class="py-1 pr-2">{windowText}</td>
				</tr>
			</tbody>
		</table>
	</div>

	<ResultsChart {results} />
</div>
