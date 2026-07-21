import { describe, test, expect } from 'vitest';
import { parseStimulusRow } from './gto-button-data';

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

	test('dash cells are skipped', () => {
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

	test('mixed: [572, "-", "x", 881, "", 772] → avgReaction≈741.67, accuracy≈0.75', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, '-', 'x', 881, '', 772]);
		expect(result.avgReaction).toBeCloseTo((572 + 881 + 772) / 3, 2);
		expect(result.accuracy).toBeCloseTo(3 / 4, 2);
	});

	test('all zero values → avgReaction is 0, accuracy is 1', () => {
		expect.assertions(2);
		const result = parseStimulusRow([0, 0, 0]);
		expect(result.avgReaction).toBe(0);
		expect(result.accuracy).toBe(1);
	});
});
