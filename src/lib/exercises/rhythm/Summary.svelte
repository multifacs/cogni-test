<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
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

	function parseMeta(meta: unknown): Record<string, string> | null {
		if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
			return meta as Record<string, string>;
		}
		return null;
	}

	function getBest(difficulty: string) {
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
</script>

<div class="w-full grid grid-cols-1 gap-3 sm:grid-cols-3">
	{#each DIFFICULTIES as { key, label }}
		{@const best = getBest(key)}
		<Card>
			<div class="flex flex-col items-center gap-1 py-2">
				<h3 class="text-sm font-semibold text-slate-700">{label}</h3>
				{#if best}
					<div class="flex flex-col items-center gap-0.5 text-sm text-slate-500">
						<span>{best.date}</span>
						<span>Среднее отклонение: {Math.round(best.meanDeviation)} мс</span>
						{#if best.overpress !== 0}
							<span>
								{best.overpress > 0
									? `Пережатия: ${best.overpress}`
									: `Недожатия: ${Math.abs(best.overpress)}`}
							</span>
						{/if}
					</div>
				{:else}
					<span class="text-sm text-slate-500">Попыток нет</span>
				{/if}
			</div>
		</Card>
	{/each}
</div>
