import { getMedian } from '$lib/utils';

// export for use in test so they don't break on every change
export const THRESHOLDS = {
	MIN_RESPONSE_TIME_MS: 300,
	MIN_ACCEPTED_RATIO: 0.85,
	MIN_ACCURACY: 0.7,
	MAX_TIME_VARIABILITY: 0.6
} as const;

type AttemptLike = {
	time?: number;
	reactionTimeMs?: number;
	isCorrect?: boolean;
	guessed?: boolean;
};

function getTime(attempt: AttemptLike) {
	return attempt.time ?? attempt.reactionTimeMs;
}

function getCorrectness(attempt: AttemptLike) {
	return attempt.isCorrect ?? attempt.guessed;
}

export function validateSession(attempts: AttemptLike[]) {
	if (!attempts?.length) return false;

	const times = attempts.map(getTime).filter((t) => t !== undefined);
	const correctness = attempts.map(getCorrectness).filter((t) => t !== undefined);
	const total = attempts.length;

	const accepted = times.filter((t) => t >= THRESHOLDS.MIN_RESPONSE_TIME_MS).length;
	if (accepted / total <= THRESHOLDS.MIN_ACCEPTED_RATIO) return false;

	const correct = correctness.filter((t) => t).length;
	if (correct / total <= THRESHOLDS.MIN_ACCURACY) return false;

	const median = getMedian(times);
	if (median) {
		const mad = getMedian(times.map((t) => Math.abs(t - median)));
		if (mad / median >= THRESHOLDS.MAX_TIME_VARIABILITY) return false;
	}

	return true;
}
