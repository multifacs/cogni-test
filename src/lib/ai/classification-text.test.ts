/**
 * Unit tests for classification-text helpers (pure functions, no server imports).
 */
import { describe, it, expect } from 'vitest';
import {
	CLASSIFICATION_INSTRUCTION,
	CLASSIFICATION_TEXT,
	RETELLING_INSTRUCTION,
	getUniqueTokens,
	isWordInText
} from './classification-text';

describe('texts from issue #105 (verbatim)', () => {
	it('exposes the instruction verbatim', () => {
		expect(CLASSIFICATION_INSTRUCTION).toBe(
			'В представленном тексте найдите как можно больше групп слов, объединённых каким-либо признаком. Напишите группы слов и признак, их объединяющий.\n' +
				'Например: Под ярким солнцем дети играли в мяч.\n' +
				'Ответ: мяч, солнце - круг.'
		);
	});

	it('exposes the stimulus text verbatim', () => {
		expect(CLASSIFICATION_TEXT).toBe(
			'Облачным летним утром пастух наблюдал за стадом овец. Когда солнце выглянуло из-за облаков, взгляд пастуха упал на малахитовую шкатулку, переливающуюся лучиками света, в траве. На удивление в столь тяжёлой шкатулке лежала небольшая янтарная бусинка.'
		);
	});

	it('exposes the retelling instruction verbatim', () => {
		expect(RETELLING_INSTRUCTION).toBe(
			'Перескажите прочитанный текст, используя от 5 до 7 слов:'
		);
	});
});

describe('getUniqueTokens', () => {
	it('splits by whitespace and strips outer punctuation', () => {
		expect(getUniqueTokens('Облачным летним утром пастух наблюдал за стадом овец.')).toEqual([
			'Облачным',
			'летним',
			'утром',
			'пастух',
			'наблюдал',
			'за',
			'стадом',
			'овец'
		]);
	});

	it('strips quotes, parentheses and dashes from token edges', () => {
		expect(getUniqueTokens('«шкатулку», (текст) — слово…')).toEqual([
			'шкатулку',
			'текст',
			'слово'
		]);
	});

	it('treats an intra-word hyphen as a single token', () => {
		expect(getUniqueTokens('выглянуло из-за облаков')).toEqual([
			'выглянуло',
			'из-за',
			'облаков'
		]);
	});

	it('dedupes by lowercase key keeping the first occurrence casing', () => {
		expect(getUniqueTokens('Солнце и солнце, СОЛНЦЕ')).toEqual(['Солнце', 'и']);
	});

	it('keeps words with the same stem as separate tokens (dedupe is by word, not stem)', () => {
		const tokens = getUniqueTokens('пастух и пастуха');
		expect(tokens).toEqual(['пастух', 'и', 'пастуха']);
	});

	it('does not fold ё into е', () => {
		// «тяжёлой» и «тяжелой» — разные lowercase-ключи? Нет: ё не нормализуется,
		// значит это два разных ключа и оба токена сохраняются.
		expect(getUniqueTokens('тяжёлой тяжелой')).toEqual(['тяжёлой', 'тяжелой']);
	});

	it('returns an empty array for an empty/whitespace-only text', () => {
		expect(getUniqueTokens('')).toEqual([]);
		expect(getUniqueTokens('   \n\t  ')).toEqual([]);
	});

	it('skips tokens that become empty after punctuation stripping', () => {
		expect(getUniqueTokens('слово — , . !')).toEqual(['слово']);
	});
});

describe('isWordInText', () => {
	it('matches a stem with a longer inflection (пастух vs пастуха)', () => {
		expect(isWordInText('пастух', 'пастух наблюдал за стадом')).toBe(true);
	});

	it('does not match when the common prefix is below the floor of 3 (овц vs овец)', () => {
		// общий префикс «ов» = 2 < max(3, min(3,4)-2=1) = 3 → false
		expect(isWordInText('овц', 'стадо овец')).toBe(false);
	});

	it('matches inflection of the same length class (шкатулке vs шкатулка)', () => {
		expect(isWordInText('шкатулке', 'в траве лежала шкатулка')).toBe(true);
	});

	it('is case-insensitive on both sides', () => {
		expect(isWordInText('Пастух', 'Пастуха наблюдал')).toBe(true);
		expect(isWordInText('пастуха', 'Пастух наблюдал')).toBe(true);
	});

	it('requires a common prefix, not substring containment', () => {
		expect(isWordInText('солнце', 'подсолнух')).toBe(false);
	});

	it('matches identical words', () => {
		expect(isWordInText('бусинка', 'янтарная бусинка')).toBe(true);
	});

	it('matches against any token of the text (hyphen tokens included as-is)', () => {
		expect(isWordInText('из-за', 'выглянуло из-за облаков')).toBe(true);
	});

	it('returns false for an empty text or an empty word', () => {
		expect(isWordInText('слово', '')).toBe(false);
		expect(isWordInText('', 'слово')).toBe(false);
	});
});
