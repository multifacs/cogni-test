import { describe, expect, it } from 'vitest';
import { filterWords, pickRandom } from './words';

describe('filterWords', () => {
	it('filters out empty lines and long words', () => {
		const raw = 'год\n\nоченьдлинноеслово\nчеловек\nTRUE\ntrue\nдом';
		const result = filterWords(raw);
		expect(result).toEqual(['год', 'человек', 'дом']);
	});

	it('includes words up to 9 characters', () => {
		const raw = '123456789\n1234567890';
		const result = filterWords(raw);
		expect(result).toEqual(['123456789']);
	});

	it('returns empty array for empty input', () => {
		expect(filterWords('')).toEqual([]);
	});
});

describe('pickRandom', () => {
	it('returns requested number of items', () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const result = pickRandom(arr, 3);
		expect(result).toHaveLength(3);
		result.forEach((item) => {
			expect(arr).toContain(item);
		});
	});

	it('does not modify original array', () => {
		const arr = [1, 2, 3, 4, 5];
		const copy = [...arr];
		pickRandom(arr, 2);
		expect(arr).toEqual(copy);
	});

	it('returns all items when count exceeds length', () => {
		const arr = [1, 2, 3];
		const result = pickRandom(arr, 10);
		expect(result).toHaveLength(3);
	});
});
