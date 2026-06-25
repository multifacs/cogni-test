import type { NumbersTrialRow } from './types';

export type { NumbersTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: NumbersTrialRow[]) {
	const totalLevels = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const digitSpan = trials.reduce(
		(max, t) => (t.isCorrect ? Math.max(max, t.digitCount) : max),
		0
	);
	const accuracy = totalLevels ? correctCount / totalLevels : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalLevels ? Math.round(totalDurationMs / totalLevels) : 0;

	return {
		totalLevels,
		correctCount,
		digitSpan,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs
	};
}
