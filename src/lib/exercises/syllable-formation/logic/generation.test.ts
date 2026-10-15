import { describe, expect, it } from 'vitest';
import type { SyllablePair } from '../types';
import { SYLLABLES } from './syllables';
import { generateSessionPairs, pairToPhrase } from './generation';

/** Мультипликативный LCG для детерминированных тестов. */
function lcg(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

const syllableSet = new Set(SYLLABLES);

function checkPairStructure(pairs: SyllablePair[]): void {
	expect(pairs).toHaveLength(5);
	for (const pair of pairs) {
		for (const word of [pair.word1, pair.word2]) {
			expect(word.length).toBeGreaterThanOrEqual(2);
			expect(word.length).toBeLessThanOrEqual(5);
			for (const syllable of word) {
				expect(syllableSet.has(syllable)).toBe(true);
			}
		}
		// Уникальность слогов внутри пары.
		const all = [...pair.word1, ...pair.word2];
		expect(new Set(all).size).toBe(all.length);
	}
}

describe('generateSessionPairs', () => {
	it('generates 5 pairs of 2 words (2–5 syllables each) from SYLLABLES with unique syllables', () => {
		for (let seed = 1; seed <= 10; seed += 1) {
			checkPairStructure(generateSessionPairs(lcg(seed)));
		}
	});

	it('does not reuse syllables across pairs when the pool is sufficient', () => {
		for (let seed = 1; seed <= 10; seed += 1) {
			const pairs = generateSessionPairs(lcg(seed));
			const all = pairs.flatMap((pair) => [...pair.word1, ...pair.word2]);
			expect(new Set(all).size).toBe(all.length);
		}
	});

	it('is deterministic for a fixed rng', () => {
		const first = generateSessionPairs(lcg(42));
		const second = generateSessionPairs(lcg(42));
		const third = generateSessionPairs(lcg(43));
		expect(first).toEqual(second);
		expect(first).not.toEqual(third);
	});

	it('produces varying word lengths across seeds', () => {
		const lengths = new Set<number>();
		for (let seed = 1; seed <= 30; seed += 1) {
			for (const pair of generateSessionPairs(lcg(seed))) {
				for (const word of [pair.word1, pair.word2]) {
					lengths.add(word.length);
				}
			}
		}
		// При 60 словах почти наверняка встречаются минимум 3 разные длины из 2–5.
		expect(lengths.size).toBeGreaterThanOrEqual(3);
	});

	it('allows cross-pair repeats but not within-pair repeats when the pool is small', () => {
		const smallPool = ['ба', 'ко', 'ми', 'ло', 'те', 'су', 'на', 'ри', 'са', 'во', 'зы', 'кы'];
		for (let seed = 1; seed <= 20; seed += 1) {
			const pairs = generateSessionPairs(lcg(seed), smallPool);
			expect(pairs).toHaveLength(5);
			for (const pair of pairs) {
				const all = [...pair.word1, ...pair.word2];
				// Малый пул: повторы между парами возможны, внутри пары — нет.
				expect(new Set(all).size).toBe(all.length);
			}
		}
	});

	it('preserves within-word uniqueness even when the pool is smaller than the pair', () => {
		const tinyPool = ['ба', 'ко', 'ми', 'ло', 'те']; // 5 различимых < максимального размера пары 10
		for (let seed = 1; seed <= 20; seed += 1) {
			const pairs = generateSessionPairs(lcg(seed), tinyPool);
			for (const pair of pairs) {
				// Внутри слова — уникальность всегда, даже когда паре слогов не хватает.
				expect(new Set(pair.word1).size).toBe(pair.word1.length);
				expect(new Set(pair.word2).size).toBe(pair.word2.length);
			}
		}
	});

	it('throws when the pool cannot fill even a single word', () => {
		// 1 различимый слог < минимальной длины слова 2 → невозможное слово.
		expect(() => generateSessionPairs(lcg(1), ['ба'])).toThrow(
			/Pool of 1 distinct syllables cannot fill a word of \d+/
		);
		// 2 различимых слога: слово длины 2 возможно, но при длине 3+ — throw.
		expect(() => generateSessionPairs(lcg(3), ['ба', 'ко'])).toThrow(
			/Pool of 2 distinct syllables cannot fill a word of \d+/
		);
	});
});

describe('pairToPhrase', () => {
	it('joins syllables with hyphens and words with a space', () => {
		const pair: SyllablePair = { word1: ['ба', 'ко', 'ми'], word2: ['ло', 'те', 'су'] };
		expect(pairToPhrase(pair)).toBe('ба-ко-ми ло-те-су');
	});

	it('renders the whole generated session in the expected format', () => {
		for (const pair of generateSessionPairs(lcg(7))) {
			const phrase = pairToPhrase(pair);
			const [word1, word2] = phrase.split(' ');
			expect(word1).toBe(pair.word1.join('-'));
			expect(word2).toBe(pair.word2.join('-'));
		}
	});
});
