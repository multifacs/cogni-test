import type { EmojiTrialRow } from './types';

export type { EmojiTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: EmojiTrialRow[]) {
	const totalTrials = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const accuracy = totalTrials ? correctCount / totalTrials : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalTrials ? Math.round(totalDurationMs / totalTrials) : 0;
	return { totalTrials, correctCount, accuracy, totalDurationMs, averageResponseTimeMs };
}

export function choiceLabel(userSaidChanged: boolean): string {
	return userSaidChanged ? 'Изменился' : 'Не изменился';
}
