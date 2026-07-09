import type { FlankerTrialRow } from './types';

export type { FlankerTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: FlankerTrialRow[]) {
	const totalTrials = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const errors = totalTrials - correctCount;
	const accuracy = totalTrials ? correctCount / totalTrials : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.reactionTimeMs, 0);
	const averageResponseTimeMs = totalTrials ? Math.round(totalDurationMs / totalTrials) : 0;

	const congruentTrials = trials.filter((t) => t.congruent);
	const incongruentTrials = trials.filter((t) => !t.congruent);
	const avgRtCongruentMs = congruentTrials.length
		? Math.round(
				congruentTrials.reduce((s, t) => s + t.reactionTimeMs, 0) / congruentTrials.length
			)
		: 0;
	const avgRtIncongruentMs = incongruentTrials.length
		? Math.round(
				incongruentTrials.reduce((s, t) => s + t.reactionTimeMs, 0) /
					incongruentTrials.length
			)
		: 0;
	const flankerEffectMs = avgRtIncongruentMs - avgRtCongruentMs;

	const timeLimit = trials.length > 0 ? trials[0].timeLimit : false;
	const elapsedTime = trials.length > 0 ? trials[0].elapsedTime : 0;

	return {
		totalTrials,
		correctCount,
		errors,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		avgRtCongruentMs,
		avgRtIncongruentMs,
		flankerEffectMs,
		timeLimit,
		elapsedTime
	};
}
