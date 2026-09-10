import type { RhythmResult } from './types';

export const RHYTHM_OVERPRESS_PENALTY_MS = 200;

/**
 * Compute a rhythm score: lower is better.
 * meanDeviationMs + absolute_overpress * penalty
 */
export function computeRhythmScore(meanDeviationMs: number, overpress: number): number {
	return meanDeviationMs + Math.abs(overpress) * RHYTHM_OVERPRESS_PENALTY_MS;
}

/**
 * Mean absolute deviation between attempt timestamps and note timestamps.
 * Returns null for an empty array.
 */
export function meanDeviation(attempts: RhythmResult[]): number | null {
	if (attempts.length === 0) return null;
	const sum = attempts.reduce((acc, a) => acc + Math.abs(a.attempt - a.note), 0);
	return sum / attempts.length;
}
