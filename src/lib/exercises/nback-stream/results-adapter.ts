import type { NBackTrialRow } from './types';

export type { NBackTrialRow } from './types';

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(trials: NBackTrialRow[]) {
	const totalClicks = trials.length;
	const correctCount = trials.filter((t) => t.isCorrect).length;
	const incorrectCount = totalClicks - correctCount;
	const accuracy = totalClicks ? correctCount / totalClicks : 0;
	const totalDurationMs = trials.reduce((sum, t) => sum + t.rtMs, 0);
	const averageResponseTimeMs = totalClicks ? Math.round(totalDurationMs / totalClicks) : 0;

	const domain = trials.length > 0 ? trials[0].domain : 'figures';
	const nBack = trials.length > 0 ? trials[0].nBack : 1;
	const target = trials.length > 0 ? trials[0].target : 'shape';
	const durationMs = trials.length > 0 ? trials[0].durationMs : 0;
	const totalStimuli = trials.length > 0 ? trials[0].totalStimuli : 0;

	return {
		totalClicks,
		correctCount,
		incorrectCount,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		domain,
		nBack,
		target,
		durationMs,
		totalStimuli
	};
}

export function domainLabel(domain: string): string {
	return domain === 'figures' ? 'Фигуры' : 'Числа';
}

export function targetLabel(target: string): string {
	switch (target) {
		case 'shape':
			return 'Форма';
		case 'color':
			return 'Цвет';
		case 'number':
			return 'Число';
		default:
			return target;
	}
}
