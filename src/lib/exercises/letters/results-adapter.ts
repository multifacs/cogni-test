import type { LettersTrialRow } from './types';

export type { LettersTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: LettersTrialRow[]) {
	const totalRounds = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const maxSpan = trials.reduce(
		(max, t) => (t.isCorrect ? Math.max(max, t.letterCount) : max),
		0
	);
	const accuracy = totalRounds ? correctCount / totalRounds : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalRounds ? Math.round(totalDurationMs / totalRounds) : 0;
	const timeoutTriggered = trials.length > 0 ? trials[0].timeoutTriggered : false;
	const elapsed = trials.length > 0 ? trials[0].elapsed : 0;

	return {
		totalRounds,
		correctCount,
		maxSpan,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		timeoutTriggered,
		elapsed
	};
}
