import type { AttentionTrialRow } from './types';

export type { AttentionTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: AttentionTrialRow[]) {
	const totalClicks = trials.length;
	const foundCount = trials.filter((t) => t.isTarget && t.isCorrect).length;
	const errorCount = trials.filter((t) => !t.isCorrect).length;
	const totalTargets = trials.length > 0 ? trials[0].totalTargets : 0;
	const totalNumbers = trials.length > 0 ? trials[0].totalNumbers : 0;
	const accuracy = totalTargets ? foundCount / totalTargets : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalClicks ? Math.round(totalDurationMs / totalClicks) : 0;

	return {
		totalClicks,
		foundCount,
		errorCount,
		totalTargets,
		totalNumbers,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs
	};
}
