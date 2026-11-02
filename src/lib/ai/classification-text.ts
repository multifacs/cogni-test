/**
 * Классификация слов (issue #105, «Вкладка ИИ-влияние»): стимульный текст,
 * инструкция и хелперы для проверки слов пользователя.
 *
 * ВАЖНО: модуль импортируется и клиентом (задача 3.3 UI) — никаких
 * server-only импортов здесь быть не должно.
 */

/**
 * Лимиты теста «Классификация» — единственный источник правды.
 * Объявлены здесь (клиент-безопасный модуль), потому что нужны и UI
 * (maxlength полей, лимит кнопки «+»), и серверному контроллеру.
 * Сервер НЕ обязан доверять этим значениям — он валидирует свой вход;
 * UI обязан не отправлять больше, чем принимает сервер.
 */
export const CLASSIFICATION_MAX_TEXT_LENGTH = 1000;
export const CLASSIFICATION_MAX_GROUPS = 50;

/** Инструкция к заданию (issue #105, дословно). */
export const CLASSIFICATION_INSTRUCTION = `В представленном тексте найдите как можно больше групп слов, объединённых каким-либо признаком. Напишите группы слов и признак, их объединяющий.
Например: Под ярким солнцем дети играли в мяч.
Ответ: мяч, солнце - круг.`;

/** Стимульный текст (issue #105, дословно, не переформулировать). */
export const CLASSIFICATION_TEXT = `Облачным летним утром пастух наблюдал за стадом овец. Когда солнце выглянуло из-за облаков, взгляд пастуха упал на малахитовую шкатулку, переливающуюся лучиками света, в траве. На удивление в столь тяжёлой шкатулке лежала небольшая янтарная бусинка.`;

/** Инструкция к пересказу (экспортируется для единства источника с задачей 3.3 UI). */
export const RETELLING_INSTRUCTION = 'Перескажите прочитанный текст, используя от 5 до 7 слов:';

/** Внешняя пунктуация, срезаемая с краёв токена. Дефис внутри слова — НЕ срезается. */
const OUTER_PUNCTUATION = '.,!?;:«»"()\'—…';

function stripOuterPunctuation(token: string): string {
	let start = 0;
	let end = token.length;
	while (start < end && OUTER_PUNCTUATION.includes(token[start])) start++;
	while (end > start && OUTER_PUNCTUATION.includes(token[end - 1])) end--;
	return token.slice(start, end);
}

/**
 * Уникальные токены текста: сплит по пробелам, стрип внешней пунктуации,
 * дефис внутри слова — один токен («из-за»), дедуп по lowercase-ключу
 * (ё→е НЕ нормализуется), сохраняется первое вхождение (канонический регистр).
 *
 * Уникальность — по слову, а не по стему: «Облачным» и «облаков» — разные токены.
 */
export function getUniqueTokens(text: string): string[] {
	const seen = new Set<string>();
	const tokens: string[] = [];
	for (const raw of text.split(/\s+/)) {
		const token = stripOuterPunctuation(raw);
		if (!token) continue;
		const key = token.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		tokens.push(token);
	}
	return tokens;
}

function commonPrefixLength(a: string, b: string): number {
	let i = 0;
	const limit = Math.min(a.length, b.length);
	while (i < limit && a[i] === b[i]) i++;
	return i;
}

/**
 * Грубая стем-проверка: слово считается найденным в тексте, если с каким-то
 * токеном текста у него общий символьный префикс ≥ max(3, min(len) − 2).
 *
 * Примеры: «пастух»≈«пастуха» (префикс 6 ≥ 4) → true;
 * «овц» vs «овец» (префикс «ов» = 2 < 3) → false; «шкатулке»≈«шкатулка» → true.
 * Обе стороны приводятся к нижнему регистру.
 */
export function isWordInText(word: string, text: string): boolean {
	const needle = word.toLowerCase();
	if (!needle) return false;
	for (const token of getUniqueTokens(text)) {
		const candidate = token.toLowerCase();
		const required = Math.max(3, Math.min(needle.length, candidate.length) - 2);
		if (commonPrefixLength(needle, candidate) >= required) return true;
	}
	return false;
}
