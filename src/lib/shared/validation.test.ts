import { describe, it, expect } from 'vitest';
import { validateSession, THRESHOLDS } from './validation';

function makeAttempts(times: number[], correctCount?: number) {
	return times.map((time, i) => ({
		time,
		isCorrect: correctCount !== undefined ? i < correctCount : true
	}));
}

describe('base cases', () => {
	it('returns false for empty array', () => {
		expect(validateSession([])).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(validateSession(undefined as any)).toBe(false);
	});
});

const aboveTime = THRESHOLDS.MIN_RESPONSE_TIME_MS + 100;
const belowTime = THRESHOLDS.MIN_RESPONSE_TIME_MS - 100;

describe('acceptance rate', () => {
	const thresholdAmountAbove = 100 * THRESHOLDS.MIN_ACCEPTED_RATIO;
	const thresholdAmountBelow = 100 - thresholdAmountAbove;

	it('valid when all times over the threshold', () => {
		const times = Array(5).fill(aboveTime);
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(true);
	});

	it('invalid when all times below the threshold', () => {
		const times = Array(5).fill(belowTime);
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(false);
	});

	it('valid when > threshold', () => {
		const times = Array(thresholdAmountAbove + 1)
			.fill(aboveTime)
			.concat(Array(thresholdAmountBelow).fill(belowTime));
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(true);
	});

	it('invalid when <= threshold', () => {
		const times = Array(thresholdAmountAbove)
			.fill(aboveTime)
			.concat(Array(thresholdAmountBelow).fill(belowTime));
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(false);
	});
});

describe('accuracy', () => {
	const thresholdAmountCorrect = 100 * THRESHOLDS.MIN_ACCURACY;

	it('valid when all correct', () => {
		const times = Array(5).fill(aboveTime);
		const attempts = makeAttempts(times, 5);
		expect(validateSession(attempts)).toBe(true);
	});

	it('invalid when all incorrect', () => {
		const times = Array(5).fill(aboveTime);
		const attempts = makeAttempts(times, 0);
		expect(validateSession(attempts)).toBe(false);
	});

	it('valid when > threshold', () => {
		const times = Array(100).fill(aboveTime);
		const attempts = makeAttempts(times, thresholdAmountCorrect + 1);
		expect(validateSession(attempts)).toBe(true);
	});

	it('invalid when <= threshold', () => {
		const times = Array(100).fill(aboveTime);
		const attempts = makeAttempts(times, thresholdAmountCorrect);
		expect(validateSession(attempts)).toBe(false);
	});
});

describe('variance', () => {
	it('valid with variance = 0', () => {
		const times = Array(5).fill(aboveTime);
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(true);
	});

	it('valid with small variance', () => {
		const times = Array(5)
			.fill(0)
			.map((_, i) => aboveTime + i);
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(true);
	});

	it('invalid with large variance', () => {
		const times = Array(5)
			.fill(0)
			.map((_, i) => Math.pow(aboveTime + 1, 2 * i + 1));
		const attempts = makeAttempts(times);
		expect(validateSession(attempts)).toBe(false);
	});
});

describe('works with different fields (guessed and reactionTimeMs)', () => {
	it('works with guessed and reactionTimeMs', () => {
		const attempts = [
			{ guessed: true, reactionTimeMs: aboveTime + 1 },
			{ guessed: true, reactionTimeMs: aboveTime + 1 },
			{ guessed: true, reactionTimeMs: aboveTime + 1 }
		];

		expect(validateSession(attempts)).toBe(true);
	});
});
