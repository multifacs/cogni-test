import { describe, expect, it } from 'vitest';
import { SYLLABLES } from './syllables';

describe('SYLLABLES data contract', () => {
	it('contains exactly 300 distinct lowercase Cyrillic syllables of length 2–4', () => {
		expect(SYLLABLES).toHaveLength(300);
		expect(new Set(SYLLABLES).size).toBe(300);
		for (const syllable of SYLLABLES) {
			expect(syllable.length).toBeGreaterThanOrEqual(2);
			expect(syllable.length).toBeLessThanOrEqual(4);
			expect(syllable).toBe(syllable.toLocaleLowerCase('ru'));
			expect(syllable).toMatch(/^[а-яё]+$/);
		}
	});
});
