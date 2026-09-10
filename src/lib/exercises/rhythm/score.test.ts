import { describe, it, expect } from 'vitest';
import { buildRhythmMeta, computeRhythmScore, meanDeviation, RHYTHM_OVERPRESS_PENALTY_MS } from './score';
import type { RhythmResult } from './types';

describe('buildRhythmMeta', () => {
	it.each([
		['easy', 0] as const,
		['easy', 3] as const,
		['medium', -1] as const,
		['medium', 0] as const,
		['hard', 5] as const,
		['hard', -2] as const
	])('returns difficulty and overpress as strings for %s with overpress=%d', (difficulty, overpress) => {
		expect(buildRhythmMeta(difficulty, overpress)).toEqual({
			difficulty: difficulty,
			overpress: String(overpress)
		});
	});

	it('stringifies zero overpress correctly', () => {
		expect(buildRhythmMeta('easy', 0).overpress).toBe('0');
	});

	it('stringifies negative overpress correctly', () => {
		expect(buildRhythmMeta('medium', -3).overpress).toBe('-3');
	});
});

describe('computeRhythmScore', () => {
	it('adds zero penalty when overpress is 0', () => {
		expect(computeRhythmScore(120, 0)).toBe(120);
	});

	it('adds positive penalty for positive overpress', () => {
		expect(computeRhythmScore(100, 3)).toBe(100 + 3 * RHYTHM_OVERPRESS_PENALTY_MS);
	});

	it('adds positive penalty for negative overpress (absolute value)', () => {
		expect(computeRhythmScore(100, -2)).toBe(100 + 2 * RHYTHM_OVERPRESS_PENALTY_MS);
	});

	it('handles zero mean deviation with overpress', () => {
		expect(computeRhythmScore(0, 1)).toBe(RHYTHM_OVERPRESS_PENALTY_MS);
	});
});

describe('meanDeviation', () => {
	it('returns null for empty array', () => {
		expect(meanDeviation([])).toBeNull();
	});

	it('returns 0 when attempt exactly matches note', () => {
		const attempts: RhythmResult[] = [{ attempt: 500, note: 500 }];
		expect(meanDeviation(attempts)).toBe(0);
	});

	it('computes mean for a single attempt', () => {
		const attempts: RhythmResult[] = [{ attempt: 480, note: 500 }];
		expect(meanDeviation(attempts)).toBe(20);
	});

	it('computes mean for symmetric deviations', () => {
		const attempts: RhythmResult[] = [
			{ attempt: 480, note: 500 }, // |-20| = 20
			{ attempt: 520, note: 500 } // |20|  = 20
		];
		expect(meanDeviation(attempts)).toBe(20);
	});

	it('computes mean for asymmetric deviations', () => {
		const attempts: RhythmResult[] = [
			{ attempt: 490, note: 500 }, // 10
			{ attempt: 530, note: 500 }, // 30
			{ attempt: 500, note: 500 } // 0
		];
		expect(meanDeviation(attempts)).toBeCloseTo(40 / 3, 10);
	});
});
