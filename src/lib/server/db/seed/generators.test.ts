vi.mock('$env/dynamic/private', () => ({
	env: { MODE: 'DEV' }
}));

import { describe, it, expect, vi } from 'vitest';
import {
	genStroop,
	genMath,
	genMemory,
	genCampimetry,
	genSwallow,
	genMunsterberg,
	genRaven,
	generateDevRandomResults,
	UnknownDevSlugError
} from './generators';

import { env } from '$env/dynamic/private';
import type { TaskClass, RuleFamily, DistractorFamily } from '$lib/exercises/raven-matrices/types';

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

const TASK_CLASSES: TaskClass[] = [
	'attribute_reasoning',
	'row_column_factorization',
	'quantity_reasoning',
	'spatial_movement',
	'grid_bitmask',
	'logical_set_reasoning',
	'structural_composition',
	'regional_texture_reasoning',
	'vector_primitive_reasoning'
];

const RULE_FAMILIES: RuleFamily[] = [
	'constant',
	'progression',
	'distribution',
	'permutation',
	'addition',
	'subtraction',
	'and',
	'or',
	'xor',
	'set_difference',
	'movement',
	'rotation',
	'reflection',
	'nesting',
	'overlay',
	'region_overlay',
	'primitive_union'
];

const DISTRACTOR_FAMILIES: DistractorFamily[] = [
	'correct',
	'repetition',
	'wrong_attribute',
	'wrong_step',
	'wrong_operation',
	'missing_component',
	'extra_component',
	'wrong_position',
	'mirror_error',
	'rotation_error',
	'wrong_layer',
	'wrong_axis',
	'wrong_region',
	'wrong_texture'
];

describe('genRaven', () => {
	it('returns exactly n elements with monotonic taskIndex and unique taskIds', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			const items = genRaven(10);
			expect(items).toHaveLength(10);
			expect(new Set(items.map((r) => r.taskId)).size).toBe(10);
			items.forEach((r, idx) => expect(r.taskIndex).toBe(idx));
			expect(genRaven(0)).toHaveLength(0);
		}
	});

	it('field types and value ranges', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			for (const r of genRaven(25)) {
				expect(typeof r.taskId).toBe('string');
				expect(r.taskId.length).toBeGreaterThan(0);
				expect(TASK_CLASSES).toContain(r.taskClass);
				expect([1, 2, 3]).toContain(r.difficultyLevel);
				expect(typeof r.difficultyScore).toBe('number');
				expect(r.difficultyScore).toBeGreaterThanOrEqual(0);
				expect(r.difficultyScore).toBeLessThanOrEqual(100);
				expect(r.selectedIndex).toBeGreaterThanOrEqual(0);
				expect(r.selectedIndex).toBeLessThanOrEqual(5);
				// dev-autoplay always answers: selectedIndex is always a number, never null
				expect(typeof r.selectedIndex).toBe('number');
				expect(r.selectedIndex).not.toBeNull();
				expect(r.correctIndex).toBeGreaterThanOrEqual(0);
				expect(r.correctIndex).toBeLessThanOrEqual(5);
				expect(typeof r.isCorrect).toBe('boolean');
				expect(r.responseTimeMs).toBeGreaterThanOrEqual(1000);
				expect(r.responseTimeMs).toBeLessThanOrEqual(30000);
				expect(typeof r.seed).toBe('string');
				expect(r.seed.length).toBeGreaterThan(0);
				if (r.selectedFamily !== null) {
					expect(DISTRACTOR_FAMILIES).toContain(r.selectedFamily);
				}
			}
		}
	});

	it('rules and skillTags are valid JSON strings; rules non-empty RuleFamily[]', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			for (const r of genRaven(25)) {
				const rules = JSON.parse(r.rules);
				expect(Array.isArray(rules)).toBe(true);
				expect(rules.length).toBeGreaterThan(0);
				for (const family of rules) {
					expect(RULE_FAMILIES).toContain(family);
				}

				const skillTags = JSON.parse(r.skillTags);
				expect(Array.isArray(skillTags)).toBe(true);
				for (const tag of skillTags) {
					expect(typeof tag).toBe('string');
				}
			}
		}
	});

	it('isCorrect ratio over 1000 samples is within loose bounds around 0.7', () => {
		const items = genRaven(1000);
		const ratio = items.filter((r) => r.isCorrect).length / items.length;
		expect(ratio).toBeGreaterThan(0.5);
		expect(ratio).toBeLessThan(0.9);
	});
});

describe('generateDevRandomResults', () => {
	it('returns flat arrays for stroop, math, campimetry, swallow, raven-matrices', () => {
		const flatSlugs = ['stroop', 'math', 'campimetry', 'swallow', 'raven-matrices'] as const;
		const expectedLengths: Record<string, number> = {
			stroop: 25,
			math: 10,
			campimetry: 20,
			swallow: 100,
			'raven-matrices': 10
		};

		for (const slug of flatSlugs) {
			const payload = generateDevRandomResults(slug);
			expect(Array.isArray(payload)).toBe(true);
			expect(payload).toHaveLength(expectedLengths[slug]);
		}
	});

	it('returns { results, meta } for memory and munsterberg', () => {
		const memoryPayload = generateDevRandomResults('memory');
		expect(Array.isArray(memoryPayload)).toBe(false);
		if (!Array.isArray(memoryPayload)) {
			expect(memoryPayload.results).toHaveLength(10);
			expect(Array.isArray(memoryPayload.meta)).toBe(true);
			// the game's meta is the 6 memorization-phase words
			expect(memoryPayload.meta).toHaveLength(6);
			for (const w of memoryPayload.meta) {
				expect(typeof w).toBe('string');
			}
		}

		const munsterbergPayload = generateDevRandomResults('munsterberg');
		expect(Array.isArray(munsterbergPayload)).toBe(false);
		if (!Array.isArray(munsterbergPayload)) {
			expect(munsterbergPayload.results.length).toBeLessThanOrEqual(8);
			expect(munsterbergPayload.meta.length).toBe(munsterbergPayload.results.length);
		}
	});

	it('throws on unknown slug', () => {
		let caught: unknown;
		try {
			generateDevRandomResults('unknown-test');
		} catch (err) {
			caught = err;
		}
		expect(caught).toBeInstanceOf(UnknownDevSlugError);
		expect((caught as Error).message).toMatch(/Unknown test slug/);
	});

	it('throws when MODE is not "DEV" (fail-closed)', () => {
		const mocked = env as { MODE?: string };
		const original = mocked.MODE;

		try {
			mocked.MODE = undefined;
			expect(() => generateDevRandomResults('stroop')).toThrow(/MODE is not "DEV"/);

			mocked.MODE = 'PROD';
			expect(() => generateDevRandomResults('math')).toThrow(/MODE is not "DEV"/);
		} finally {
			mocked.MODE = original;
		}
	});
});
