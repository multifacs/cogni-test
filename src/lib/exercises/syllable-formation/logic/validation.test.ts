import { describe, expect, it } from 'vitest';
import type { SyllablePair } from '../types';
import { isRecallCorrect, normalizePhrase, validateAssociation } from './validation';

const pair: SyllablePair = { word1: ['ба', 'ко', 'ми'], word2: ['ло', 'те', 'су'] };

describe('normalizePhrase', () => {
	it('lowercases and strips hyphens, spaces and punctuation', () => {
		expect(normalizePhrase('БА-КО-МИ ЛО-ТЕ-СУ')).toBe('бакомилотесу');
		expect(normalizePhrase('  ба , ко ! ми — ло ? те . су  ')).toBe('бакомилотесу');
	});

	it('folds ё to е', () => {
		expect(normalizePhrase('Ёл-ка КЁД-р')).toBe('елкакедр');
	});

	it('drops non-Russian letters entirely', () => {
		expect(normalizePhrase('ба12коabcми')).toBe('бакоми');
	});
});

describe('isRecallCorrect', () => {
	it('accepts recall differing only in case, hyphens, spaces and punctuation', () => {
		expect(isRecallCorrect('БА-КО-МИ ЛО-ТЕ-СУ', 'ба-ко-ми ло-те-су')).toBe(true);
		expect(isRecallCorrect('  бако,ми лоте су!', 'бакоми лотесу')).toBe(true);
	});

	it('rejects recall with an extra letter', () => {
		expect(isRecallCorrect('ба-ко-ми ло-те-суу', 'ба-ко-ми ло-те-су')).toBe(false);
	});

	it('rejects a wrong letter', () => {
		expect(isRecallCorrect('ба-ко-ми ло-те-сы', 'ба-ко-ми ло-те-су')).toBe(false);
	});
});

describe('validateAssociation', () => {
	it('returns empty for blank or single-letter associations', () => {
		expect(validateAssociation('', pair)).toEqual({ valid: false, reason: 'empty' });
		expect(validateAssociation('  , . ! ', pair)).toEqual({ valid: false, reason: 'empty' });
		expect(validateAssociation('а', pair)).toEqual({ valid: false, reason: 'empty' });
	});

	it('returns too-similar when the association equals the phrase', () => {
		expect(validateAssociation('ба-ко-ми ло-те-су', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
		expect(validateAssociation('  БАКОМИ ЛОТЕСУ ', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
	});

	it('returns too-similar when the association equals one of the words', () => {
		expect(validateAssociation('бакоми', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
		expect(validateAssociation('ло-те-су', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
	});

	it('returns too-similar when the association contains a whole word', () => {
		expect(validateAssociation('вспомнить бакоми быстро', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
	});

	it('returns too-similar when a word contains the association', () => {
		// 'оми' целиком входит в слово 'бакоми'.
		expect(validateAssociation('оми', pair)).toEqual({ valid: false, reason: 'too-similar' });
	});

	it('returns too-similar for a common substring of 3+ characters', () => {
		const withKon: SyllablePair = { word1: ['кон', 'ва', 'ри'], word2: ['та', 'не', 'кос'] };
		// 'конь' и фраза делят подстроку 'кон' (LCS ≥ 3); общий слог один — ловит именно правило подстрок.
		expect(validateAssociation('конь', withKon)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
	});

	it('returns too-similar for a syllable permutation that dodges the substring rule', () => {
		// 'микоба' vs 'бакомилотесу': общих подстрок ≥ 3 нет, но слоги ми/ко/ба — 3 общих.
		expect(validateAssociation('ми-ко-ба', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
		expect(validateAssociation('микоба', pair)).toEqual({
			valid: false,
			reason: 'too-similar'
		});
	});

	it('accepts a normal unrelated association', () => {
		expect(validateAssociation('море', pair)).toEqual({ valid: true });
		expect(validateAssociation('поезд', pair)).toEqual({ valid: true });
	});

	it('accepts an association sharing 1–2 syllables without longer substrings', () => {
		const monaLisa: SyllablePair = { word1: ['мо', 'на'], word2: ['ри', 'са'] };
		// 'море' содержит слог 'мо'; подстрок ≥ 3 нет; общих слогов 1.
		expect(validateAssociation('море', monaLisa)).toEqual({ valid: true });
		// 'моса' содержит слоги 'мо' и 'са'; подстрок ≥ 3 нет; общих слогов 2.
		expect(validateAssociation('моса', monaLisa)).toEqual({ valid: true });
	});

	it('accepts an association with a common substring of exactly 2 characters', () => {
		const pair2: SyllablePair = { word1: ['ба', 'ка'], word2: ['ри', 'са'] };
		// 'таба' и фраза 'бакариса' делят подстроку 'ба' (длина 2 < 3);
		// общий слог один ('ба') — граница ровно 2: валидно.
		expect(validateAssociation('таба', pair2)).toEqual({ valid: true });
	});
});
