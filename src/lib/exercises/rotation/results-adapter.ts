/** Одна строка таблицы rotation_attempt, как её возвращает DB (drizzle $inferSelect). */
export type RotationAttemptRow = {
	/** DB-поля опциональны: wire-формат (POST results) приходит без них. */
	id?: string;
	taskIndex: number;
	difficultyLevel: number;
	gridSize: number;
	selectedIndex: number | null;
	correctIndex: number;
	isCorrect: boolean;
	responseTimeMs: number;
	timedOut: boolean;
	seed: string;
	sessionId?: string;
	createdAt?: string;
};

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms)) return '—';
	if (ms < 1000) return `${Math.round(ms)} мс`;
	return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(attempts: RotationAttemptRow[]) {
	const totalQuestions = attempts.length;
	const correctCount = attempts.filter((a) => a.isCorrect).length;
	const accuracy = totalQuestions ? correctCount / totalQuestions : 0;
	const totalDurationMs = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0);
	const averageResponseTimeMs = totalQuestions ? Math.round(totalDurationMs / totalQuestions) : 0;
	const timeouts = attempts.filter((a) => a.timedOut).length;

	const perDifficulty = {
		easy: emptyDifficulty(),
		medium: emptyDifficulty(),
		hard: emptyDifficulty()
	};
	for (const a of attempts) {
		const bucket =
			a.difficultyLevel === 1 ? 'easy' : a.difficultyLevel === 2 ? 'medium' : 'hard';
		const d = perDifficulty[bucket];
		d.total += 1;
		if (a.isCorrect) d.correct += 1;
	}
	for (const d of Object.values(perDifficulty)) {
		d.accuracy = d.total ? Math.round((d.correct / d.total) * 100) : 0;
	}

	return {
		totalQuestions,
		correctCount,
		accuracy,
		totalDurationMs,
		averageResponseTimeMs,
		timeouts,
		perDifficulty
	};
}

function emptyDifficulty() {
	return { total: 0, correct: 0, accuracy: 0 };
}

export function resultRows(attempts: RotationAttemptRow[]) {
	return attempts.map((answer, index) => ({
		index: index + 1,
		isCorrect: answer.isCorrect,
		responseTimeMs: answer.responseTimeMs,
		difficultyLevel: answer.difficultyLevel,
		gridSize: answer.gridSize,
		timedOut: answer.timedOut
	}));
}
