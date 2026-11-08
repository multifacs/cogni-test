import type { FoldSpec, OrigamiAttemptRow, OrigamiDifficulty } from './types';

export type { OrigamiAttemptRow } from './types';

export const DIFFICULTY_LABELS: Record<OrigamiDifficulty, string> = {
	simple: 'Простая',
	medium: 'Средняя',
	hard: 'Сложная'
};

export function difficultyLabel(difficulty: OrigamiDifficulty): string {
	return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

/** folds хранится в БД как JSON-строка; некорректное значение → пустой список. */
export function parseFolds(folds: string): FoldSpec[] {
	try {
		const parsed = JSON.parse(folds);
		return Array.isArray(parsed) ? (parsed as FoldSpec[]) : [];
	} catch {
		return [];
	}
}

export type DifficultySummary = {
	difficulty: OrigamiDifficulty;
	total: number;
	correct: number;
	accuracy: number;
};

export type OrigamiSummary = {
	totalQuestions: number;
	correctCount: number;
	accuracy: number;
	totalDurationMs: number;
	averageResponseTimeMs: number;
	byDifficulty: DifficultySummary[];
};

const DIFFICULTY_ORDER: OrigamiDifficulty[] = ['simple', 'medium', 'hard'];

export function summary(attempts: OrigamiAttemptRow[]): OrigamiSummary {
	const totalQuestions = attempts.length;
	const correctCount = attempts.filter((a) => a.isCorrect).length;
	const accuracy = totalQuestions ? correctCount / totalQuestions : 0;
	const totalDurationMs = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0);
	const averageResponseTimeMs = totalQuestions ? Math.round(totalDurationMs / totalQuestions) : 0;

	const byDifficulty = DIFFICULTY_ORDER.map((difficulty) => {
		const rows = attempts.filter((a) => a.difficulty === difficulty);
		const correct = rows.filter((a) => a.isCorrect).length;
		return {
			difficulty,
			total: rows.length,
			correct,
			accuracy: rows.length ? correct / rows.length : 0
		};
	});

	return {
		totalQuestions,
		correctCount,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		byDifficulty
	};
}

export function resultRows(attempts: OrigamiAttemptRow[]) {
	return attempts.map((answer, index) => ({
		index: index + 1,
		difficultyLabel: difficultyLabel(answer.difficulty),
		foldsCount: parseFolds(answer.folds).length,
		selectedIndex: answer.selectedIndex,
		correctIndex: answer.correctIndex,
		isCorrect: answer.isCorrect,
		responseTimeMs: answer.responseTimeMs
	}));
}
