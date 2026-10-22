<script lang="ts">
	import type { SimonResult } from './types';
	import { summarize } from './results-adapter';
	import ResultsChart from './ResultsChart.svelte';

	// exerciseType передаётся generic-страницей результатов, но здесь не нужен;
	// в деструктуризацию не включаем (паттерн corsi-block).
	let {
		results,
		meta = null
	}: {
		results: SimonResult[];
		meta?: Record<string, string> | null;
	} = $props();

	const summary = $derived(summarize(results));

	// Человекочитаемый формат: секунды с десятыми для «медленных» значений,
	// миллисекунды для «быстрых», чтобы не терять точность ниже секунды.
	function formatMs(ms: number): string {
		return ms >= 1000 ? `${(ms / 1000).toFixed(1)} с` : `${Math.round(ms)} мс`;
	}

	function formatPercent(fraction: number): string {
		return `${Math.round(fraction * 100)} %`;
	}

	// Новая мета: длительности частей в мс, «10000+30000+60000» →
	// «Длительность частей: 10 / 30 / 60 с».
	const blockDurationsText = $derived.by(() => {
		const raw = meta?.blockDurationsMs;
		if (raw == null) return '';
		const parts = raw.split('+').map(Number);
		if (parts.length === 0 || parts.some((ms) => !Number.isFinite(ms))) return '';
		return `${parts.map((ms) => (ms >= 1000 ? Math.round(ms / 1000) : ms)).join(' / ')} с`;
	});

	// Старые сессии хранят окно ответа на пробу — показываем его как fallback.
	const windowText = $derived.by(() => {
		const raw = meta?.windowMs;
		if (raw == null) return '';
		const val = Number(raw);
		if (Number.isNaN(val)) return raw;
		// Окно ответа — круглое число секунд («3 с»), без десятых.
		return val >= 1000 ? `${Math.round(val / 1000)} с` : `${Math.round(val)} мс`;
	});
</script>

<div class="flex w-full flex-col items-center gap-2 py-2 text-sm sm:text-base">
	<div class="w-full max-w-lg overflow-x-auto">
		<table class="w-full border-collapse text-left whitespace-nowrap">
			<thead>
				<tr class="border-b border-gray-300 text-gray-500">
					<th class="py-1 pr-2 font-medium">Часть</th>
					<th class="py-1 pr-2 font-medium">Проб</th>
					<th class="py-1 pr-2 font-medium">Верно / ошибок</th>
					<th class="py-1 pr-2 font-medium">Точность</th>
					<th class="py-1 pr-2 font-medium">Среднее время</th>
					<th class="py-1 pr-2 font-medium">Таймауты</th>
				</tr>
			</thead>
			<tbody>
				{#each summary.blocks as row (row.block)}
					<tr class="border-b border-gray-200 last:border-0">
						<td class="py-1 pr-2">Часть {row.block}</td>
						<td class="py-1 pr-2">{row.trials}</td>
						<td class="py-1 pr-2">{row.correct} / {row.errors}</td>
						<td class="py-1 pr-2">{formatPercent(row.accuracy)}</td>
						<td class="py-1 pr-2">
							{#if row.meanResponseMs !== null}
								{formatMs(row.meanResponseMs)}
							{:else}
								—
							{/if}
						</td>
						<td class="py-1 pr-2">{row.timeouts}</td>
					</tr>
				{/each}
				<tr class="border-b border-gray-300 font-medium">
					<td class="py-1 pr-2">Итого</td>
					<td class="py-1 pr-2">{summary.overall.trials}</td>
					<td class="py-1 pr-2">
						{summary.overall.correct} / {summary.overall.errors}
					</td>
					<td class="py-1 pr-2">{formatPercent(summary.overall.accuracy)}</td>
					<td class="py-1 pr-2">
						{#if summary.overall.meanResponseMs !== null}
							{formatMs(summary.overall.meanResponseMs)}
						{:else}
							—
						{/if}
					</td>
					<td class="py-1 pr-2">{summary.overall.timeouts}</td>
				</tr>
			</tbody>
		</table>
	</div>

	<p class="text-gray-600 dark:text-gray-400">
		Эффект Симона (инконгруэнтные − конгруэнтные):
		{summary.effect.effectMs !== null ? formatMs(summary.effect.effectMs) : '—'}
	</p>
	{#if blockDurationsText}
		<p class="text-gray-600 dark:text-gray-400">Длительность частей: {blockDurationsText}</p>
	{:else if windowText}
		<p class="text-gray-600 dark:text-gray-400">Окно ответа: {windowText}</p>
	{/if}

	<ResultsChart {results} />
</div>
