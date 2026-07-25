import { describe, test, expect } from 'vitest';
import { parseStimulusRow, formatSpeed, formatAccuracy } from './button-metrics';

describe('parseStimulusRow', () => {
	test('all numeric cells → correct average and 100% accuracy', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, 881, 772]);
		expect(result.avgReaction).toBeCloseTo((572 + 881 + 772) / 3, 2);
		expect(result.accuracy).toBe(1);
	});

	test('mix of numbers and x → correct average and reduced accuracy', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, 'x', 881]);
		expect(result.avgReaction).toBeCloseTo((572 + 881) / 2, 2);
		expect(result.accuracy).toBeCloseTo(2 / 3, 2);
	});

	test('dash cells count as correct omissions', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, '-', 881]);
		expect(result.avgReaction).toBeCloseTo((572 + 881) / 2, 2);
		expect(result.accuracy).toBe(1);
	});

	test('empty array → returns both null', () => {
		expect.assertions(2);
		const result = parseStimulusRow([]);
		expect(result.avgReaction).toBeNull();
		expect(result.accuracy).toBeNull();
	});

	test('all x → avgReaction is null, accuracy is 0', () => {
		expect.assertions(2);
		const result = parseStimulusRow(['x', 'x', 'x']);
		expect(result.avgReaction).toBeNull();
		expect(result.accuracy).toBe(0);
	});

	test('mixed: [572, "-", "x", 881, "", 772] → avgReaction≈741.67, accuracy≈0.667', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, '-', 'x', 881, '', 772]);
		expect(result.avgReaction).toBeCloseTo((572 + 881 + 772) / 3, 2);
		expect(result.accuracy).toBeCloseTo(4 / 6, 2);
	});

	test('all zero values → avgReaction is 0, accuracy is 1', () => {
		expect.assertions(2);
		const result = parseStimulusRow([0, 0, 0]);
		expect(result.avgReaction).toBe(0);
		expect(result.accuracy).toBe(1);
	});

	test('all dashes → avgReaction is null, accuracy is 1', () => {
		expect.assertions(2);
		const result = parseStimulusRow(['-', '-', '-']);
		expect(result.avgReaction).toBeNull();
		expect(result.accuracy).toBe(1);
	});

	test('dashes with one x → avgReaction is null, accuracy≈0.667', () => {
		expect.assertions(2);
		const result = parseStimulusRow(['-', 'x', '-']);
		expect(result.avgReaction).toBeNull();
		expect(result.accuracy).toBeCloseTo(2 / 3, 2);
	});
});

describe('formatSpeed', () => {
	test('null → —', () => {
		expect.assertions(1);
		expect(formatSpeed(null)).toBe('—');
	});

	test('positive number → value with 2 decimals and мс', () => {
		expect.assertions(1);
		expect(formatSpeed(350.5)).toBe('350.50 мс');
	});

	test('zero → 0.00 мс', () => {
		expect.assertions(1);
		expect(formatSpeed(0)).toBe('0.00 мс');
	});
});

describe('formatAccuracy', () => {
	test('(5, 10) → 5/10 = 50.0%', () => {
		expect.assertions(1);
		expect(formatAccuracy(5, 10)).toBe('5/10 = 50.0%');
	});

	test('(0, 10) → 0/10 = 0.0%', () => {
		expect.assertions(1);
		expect(formatAccuracy(0, 10)).toBe('0/10 = 0.0%');
	});

	test('(10, 0) → 10/0 = 0.0%', () => {
		expect.assertions(1);
		expect(formatAccuracy(10, 0)).toBe('10/0 = 0.0%');
	});
});
