import { describe, it, expect } from 'vitest';
import {
	genStroop,
	genMath,
	genMemory,
	genCampimetry,
	genSwallow,
	genMunsterberg
} from './generators';

import type { Color } from '$lib/tests/stroop/types';
import type { Sign } from '$lib/tests/math/types';
import type { CampimetryResult } from '$lib/tests/campimetry/types';
import type { SwallowResult, Direction, Background } from '$lib/tests/swallow/types';

const ITERATIONS = 50;

const COLORS: Color[] = ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'];
const STROOP_TASKS: ('both' | 'meaning' | 'color')[] = ['both', 'meaning', 'color'];
const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];
const BACKGROUNDS: Background[] = ['red', 'blue'];
const SIGNS: Sign[] = ['>', '<', '>=', '<=', '=', '!='];
const SILHOUETTES = ['bird', 'tree', 'house', 'fish', 'star'];
const CAMPIMETRY_CHANNELS: ('a' | 'b')[] = ['a', 'b'];
const CAMPIMETRY_OPS: ('+' | '-')[] = ['+', '-'];
const CAMPIMETRY_COLORS = [
	'dark-magenta',
	'light-magenta',
	'dark-blue',
	'light-blue',
	'dark-green',
	'light-green',
	'dark-red',
	'light-red'
];
const MUNSTERBERG_WORDS = [
	'СОЛНЦЕ',
	'ДОРОГА',
	'КОРАБЛЬ',
	'ПТИЦА',
	'ЗЕРКАЛО',
	'ВОЛНА',
	'ГОРОД',
	'КНИГА'
];

describe('result generators', () => {
	it('genStroop(n) returns exactly n elements', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			expect(genStroop(25)).toHaveLength(25);
			expect(genStroop(10)).toHaveLength(10);
			expect(genStroop(0)).toHaveLength(0);
		}
	});

	it('genStroop valid enum values', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			for (const r of genStroop(25)) {
				expect(COLORS).toContain(r.word);
				expect(COLORS).toContain(r.color);
				expect(COLORS).toContain(r.userAnswer);
				expect(STROOP_TASKS).toContain(r.task);
			}
		}
	});

	it('genStroop(25) stage distribution is exactly 5/10/10', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genStroop(25);
			const stage1 = items.filter((r) => r.stage === 1).length;
			const stage2 = items.filter((r) => r.stage === 2).length;
			const stage3 = items.filter((r) => r.stage === 3).length;
			expect([stage1, stage2, stage3]).toEqual([5, 10, 10]);
		}
	});

	it('genStroop monotonic attempt indices', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genStroop(25);
			items.forEach((r, idx) => expect(r.attempt).toBe(idx));
		}
	});

	it('genMath(n) returns exactly n elements', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			expect(genMath(10)).toHaveLength(10);
			expect(genMath(5)).toHaveLength(5);
			expect(genMath(0)).toHaveLength(0);
		}
	});

	it('genMath valid enum values', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			for (const r of genMath(10)) {
				expect(SIGNS).toContain(r.sign);
				expect(typeof r.correctAnswer).toBe('boolean');
				const userAnswerIsBool = typeof r.userAnswer === 'boolean';
				const userAnswerIsNull = r.userAnswer === null;
				expect(userAnswerIsBool || userAnswerIsNull).toBe(true);
			}
		}
	});

	it('genMath monotonic attempt indices', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genMath(10);
			items.forEach((r, idx) => expect(r.attempt).toBe(idx));
		}
	});

	it('genMemory(n) returns exactly n elements', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			expect(genMemory(10)).toHaveLength(10);
			expect(genMemory(5)).toHaveLength(5);
			expect(genMemory(0)).toHaveLength(0);
		}
	});

	it('genMemory monotonic attempt indices', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genMemory(10);
			items.forEach((r, idx) => expect(r.attempt).toBe(idx));
		}
	});

	it('genCampimetry(n) returns exactly n elements', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			expect(genCampimetry(20)).toHaveLength(20);
			expect(genCampimetry(5)).toHaveLength(5);
			expect(genCampimetry(0)).toHaveLength(0);
		}
	});

	it('genCampimetry valid enum values', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			for (const r of genCampimetry(20)) {
				expect(SILHOUETTES).toContain(r.silhouette);
				expect(CAMPIMETRY_CHANNELS).toContain(r.channel);
				expect(CAMPIMETRY_OPS).toContain(r.op);
				expect(CAMPIMETRY_COLORS).toContain(r.color);
			}
		}
	});

	it('genCampimetry monotonic attempt indices', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genCampimetry(20);
			items.forEach((r, idx) => expect(r.attempt).toBe(idx));
		}
	});

	it('genSwallow(n) returns exactly n elements', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			expect(genSwallow(100)).toHaveLength(100);
			expect(genSwallow(10)).toHaveLength(10);
			expect(genSwallow(0)).toHaveLength(0);
		}
	});

	it('genSwallow valid enum values', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			for (const r of genSwallow(20) as SwallowResult[]) {
				expect(DIRECTIONS).toContain(r.direction);
				expect(DIRECTIONS).toContain(r.correctAnswer);
				expect(DIRECTIONS).toContain(r.userAnswer);
				expect(BACKGROUNDS).toContain(r.background);
			}
		}
	});

	it('genSwallow monotonic attempt indices', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genSwallow(20);
			items.forEach((r, idx) => expect(r.attempt).toBe(idx));
		}
	});

	it('genMunsterberg(8) returns results and words of same length <= 8', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const { results, words } = genMunsterberg(8);
			expect(results.length).toBe(words.length);
			expect(results.length).toBeLessThanOrEqual(8);
		}
	});

	it('genMunsterberg words are unique and from the known word list', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const { words } = genMunsterberg(8);
			const unique = new Set(words);
			expect(unique.size).toBe(words.length);
			for (const w of words) {
				expect(MUNSTERBERG_WORDS).toContain(w);
			}
		}
	});

	it('genMunsterberg monotonic attempt indices', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const { results } = genMunsterberg(8);
			results.forEach((r, idx) => expect(r.attempt).toBe(idx));
		}
	});
});
