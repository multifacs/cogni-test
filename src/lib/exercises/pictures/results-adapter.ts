import type { PicturesTrialRow } from './types';

export type { PicturesTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: PicturesTrialRow[]) {
	const scoredTrials = trials.filter((t) => t.scored);
	const totalQuestions = trials.length;
	const scoredCount = scoredTrials.length;
	const correctCount = scoredTrials.filter((t) => t.isCorrect === true).length;
	const maxScore = scoredCount;
	const accuracy = maxScore ? correctCount / maxScore : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalQuestions ? Math.round(totalDurationMs / totalQuestions) : 0;

	return {
		totalQuestions,
		scoredCount,
		correctCount,
		maxScore,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs
	};
}

export function kindLabel(kind: string): string {
	switch (kind) {
		case 'binary':
			return 'Да/Нет';
		case 'choice':
			return 'Выбор';
		case 'observe':
			return 'Наблюдение';
		default:
			return kind;
	}
}
