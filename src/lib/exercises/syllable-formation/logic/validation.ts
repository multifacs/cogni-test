import type { SyllablePair } from '../types';

const RUSSIAN_LETTERS_ONLY_RE = /[^а-я]/g;

/** Нижний регистр, ё → е, затем удаляется всё, кроме а–я (дефисы, пробелы, пунктуация игнорируются). */
function normalize(s: string): string {
	return s.toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(RUSSIAN_LETTERS_ONLY_RE, '');
}

export function normalizePhrase(s: string): string {
	return normalize(s);
}

/** Равенство восстановленного сочетания оригиналу на нормализованных строках. */
export function isRecallCorrect(recalled: string, phrase: string): boolean {
	return normalizePhrase(recalled) === normalizePhrase(phrase);
}

/** Существует ли общая подстрока длиной ≥ 3 символов (longest common substring ≥ 3). */
function hasCommonSubstringOfLength3(a: string, b: string): boolean {
	if (a.length < 3 || b.length < 3) return false;
	for (let i = 0; i + 3 <= a.length; i += 1) {
		if (b.includes(a.slice(i, i + 3))) return true;
	}
	return false;
}

/** Сколько различных слогов фразы встречаются как подстроки в ассоциации. */
function sharedSyllableCount(pair: SyllablePair, normalizedAssociation: string): number {
	const syllables = [...pair.word1, ...pair.word2].map(normalize);
	const found = syllables.filter(
		(syllable) => syllable !== '' && normalizedAssociation.includes(syllable)
	);
	return new Set(found).size;
}

export type AssociationValidation = { valid: boolean; reason?: 'empty' | 'too-similar' };

/**
 * Проверяет ассоциацию пользователя к псевдословосочетанию.
 *
 * Правила (на нормализованных строках; нормализованная фраза — конкатенация
 * нормализованных слогов без дефисов и пробелов):
 * 1. empty — после нормализации меньше 2 символов;
 * 2. too-similar — ассоциация совпадает с фразой/словом, содержит их (или
 *    наоборот), делит с фразой подстроку ≥ 3 символов или ≥ 3 слогов фразы
 *    встречаются в ассоциации как подстроки (ловит перестановки слогов).
 */
export function validateAssociation(
	association: string,
	pair: SyllablePair
): AssociationValidation {
	const normalizedAssociation = normalize(association);
	if (normalizedAssociation.length < 2) return { valid: false, reason: 'empty' };

	const wordNormals = [pair.word1, pair.word2].map((word) => word.map(normalize).join(''));
	const phraseNormal = wordNormals.join('');

	const parts = [phraseNormal, ...wordNormals];
	if (
		parts.some(
			(part) =>
				normalizedAssociation === part ||
				normalizedAssociation.includes(part) ||
				part.includes(normalizedAssociation)
		)
	) {
		return { valid: false, reason: 'too-similar' };
	}
	if (hasCommonSubstringOfLength3(normalizedAssociation, phraseNormal)) {
		return { valid: false, reason: 'too-similar' };
	}
	if (sharedSyllableCount(pair, normalizedAssociation) >= 3) {
		return { valid: false, reason: 'too-similar' };
	}
	return { valid: true };
}
