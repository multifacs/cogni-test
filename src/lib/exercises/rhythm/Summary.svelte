<script lang="ts">
	import { formatUserLocalDate } from '$lib/utils/common.js';
	import { computeRhythmScore, meanDeviation } from './score';
	import type { RhythmResult } from './types';

	const {
		results
	}: {
		results: {
			sessionId: string;
			createdAt: string;
			attempts: unknown[];
			meta?: Record<string, string> | unknown;
		}[];
	} = $props();

	const DIFFICULTIES = [
		{ key: 'easy', label: 'Легкий' },
		{ key: 'medium', label: 'Средний' },
		{ key: 'hard', label: 'Сложный' }
	] as const;

	type Best = { date: string; meanDeviation: number; overpress: number } | null;

	function parseMeta(meta: unknown): Record<string, string> | null {
		if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
			return meta as Record<string, string>;
		}
		return null;
	}

	function getBest(difficulty: string): Best {
		const candidates = results
			.map((r) => ({ ...r, meta: parseMeta(r.meta) }))
			.filter((r) => r.meta?.difficulty === difficulty);

		if (candidates.length === 0) return null;

		let best = candidates[0];
		let bestScore = Infinity;

		for (const s of candidates) {
			const attempts = s.attempts as RhythmResult[];
			const md = meanDeviation(attempts);
			if (md === null || !Number.isFinite(md)) continue;
			const op = Number(s.meta?.overpress ?? '0');
			if (!Number.isFinite(op)) continue;
			const score = computeRhythmScore(md, op);
			if (!Number.isFinite(score)) continue;
			if (score < bestScore) {
				bestScore = score;
				best = s;
			}
		}

		if (bestScore === Infinity) return null;

		const bestAttempts = best.attempts as RhythmResult[];
		const bestMd = meanDeviation(bestAttempts);
		if (bestMd === null || !Number.isFinite(bestMd)) return null;
		const bestOp = Number(best.meta?.overpress ?? '0');
		if (!Number.isFinite(bestOp)) return null;
		return {
			date: formatUserLocalDate(best.createdAt),
			meanDeviation: bestMd,
			overpress: bestOp
		};
	}

	// считаем один раз на сложность, а не в каждой строке
	const bestByDifficulty = $derived.by(() => {
		const map: Record<string, Best> = {};
		for (const { key } of DIFFICULTIES) {
			map[key] = getBest(key);
		}
		return map;
	});

	function overpressLabel(op: number): string {
		if (op > 0) return `Пережатия: ${op}`;
		if (op < 0) return `Недожатия: ${Math.abs(op)}`;
		return '0';
	}
</script>

<div class="w-full overflow-x-auto rounded-2xl bg-white shadow">
	<table class="w-full border-collapse text-left text-sm">
		<thead>
			<tr>
				<th
					colspan="4"
					class="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-800"
					>Лучшие попытки</th
				>
			</tr>
			<tr class="border-b border-gray-200 text-gray-600">
				<th scope="col" class="px-4 py-2 font-medium">Уровень</th>
				{#each DIFFICULTIES as { label } (label)}
					<th scope="col" class="px-4 py-2 font-semibold text-gray-800">{label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			<tr class="border-b border-gray-100">
				<th scope="row" class="px-4 py-2 font-medium text-gray-600">Дата и время</th>
				{#each DIFFICULTIES as { key } (key)}
					{@const best = bestByDifficulty[key]}
					<td class="px-4 py-2 text-gray-800">{best ? best.date : '—'}</td>
				{/each}
			</tr>
			<tr class="border-b border-gray-100">
				<th scope="row" class="px-4 py-2 font-medium text-gray-600">Среднее отклонение</th>
				{#each DIFFICULTIES as { key } (key)}
					{@const best = bestByDifficulty[key]}
					<td class="px-4 py-2 text-gray-800"
						>{best ? `${Math.round(best.meanDeviation)} мс` : '—'}</td
					>
				{/each}
			</tr>
			<tr>
				<th scope="row" class="px-4 py-2 font-medium text-gray-600">Пережатия</th>
				{#each DIFFICULTIES as { key } (key)}
					{@const best = bestByDifficulty[key]}
					<td class="px-4 py-2 text-gray-800"
						>{best ? overpressLabel(best.overpress) : '—'}</td
					>
				{/each}
			</tr>
		</tbody>
	</table>
</div>
