/**
 * Контроллер классификации слов (issue #105, Phase 2).
 *
 * Сохраняет результат теста: session (testType 'classification'),
 * группы слов и пересказ (0..1 строк). Каждый submit — НОВАЯ session
 * (не upsert), история попыток сохраняется.
 *
 * Рабочие ограничения (fail-loud, не молча резать):
 * - не более 50 непустых групп;
 * - feature, retelling и каждый элемент words — не более 1000 символов.
 *
 * Группа без слов отбрасывается (пустые groups[].words);
 * feature при непустых словах опциональна (пустая строка допустима).
 * Пустой retelling допустим — строка пересказа тогда не создаётся.
 */
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import {
	classificationWordGroup,
	classificationRetelling
} from '$lib/server/db/models/ai';
import type {
	InsertClassificationWordGroup,
	InsertClassificationRetelling
} from '$lib/server/db/models/ai';
import { generate } from 'short-uuid';
import {
	CLASSIFICATION_MAX_TEXT_LENGTH,
	CLASSIFICATION_MAX_GROUPS
} from '$lib/ai/classification-text';

// Лимиты объявлены в клиент-безопасном $lib/ai/classification-text.ts;
// здесь — re-export для стабильности существующего API сервера.
export { CLASSIFICATION_MAX_TEXT_LENGTH, CLASSIFICATION_MAX_GROUPS };

/** Одна группа слов ответа пользователя. */
export interface ClassificationGroupInput {
	words: string[];
	feature: string;
}

/** Полный payload POST /ai/classification. */
export interface ClassificationPayloadInput {
	groups: ClassificationGroupInput[];
	retelling: string;
}

function assertLength(field: string, value: string): void {
	if (value.length > CLASSIFICATION_MAX_TEXT_LENGTH) {
		throw new Error(
			`${field} exceeds ${CLASSIFICATION_MAX_TEXT_LENGTH} characters (got ${value.length})`
		);
	}
}

/**
 * Сохранить результат классификации: session + группы + пересказ.
 * Возвращает id созданной session.
 */
export async function saveClassificationResult(
	userId: string,
	payload: ClassificationPayloadInput
): Promise<string> {
	assertLength('retelling', payload.retelling);

	// Пустые группы (0 слов) отбрасываются до лимита и валидации feature.
	const nonEmptyGroups = payload.groups.filter((g) => g.words.length > 0);
	if (nonEmptyGroups.length > CLASSIFICATION_MAX_GROUPS) {
		throw new Error(
			`Too many classification groups: ${nonEmptyGroups.length} > ${CLASSIFICATION_MAX_GROUPS}`
		);
	}
	for (const group of nonEmptyGroups) {
		assertLength('feature', group.feature);
		group.words.forEach((word, i) => assertLength(`words[${i}]`, word));
	}

	const sessionId = generate();

	await db.transaction(async (tx) => {
		await tx.insert(session).values({
			id: sessionId,
			userId,
			testType: 'classification'
		});

		if (nonEmptyGroups.length > 0) {
			const groupRows: InsertClassificationWordGroup[] = nonEmptyGroups.map(
				(group, index) => ({
					id: generate(),
					sessionId,
					groupIndex: index,
					words: JSON.stringify(group.words),
					feature: group.feature
				})
			);
			await tx.insert(classificationWordGroup).values(groupRows);
		}

		if (payload.retelling.length > 0) {
			const retellingRow: InsertClassificationRetelling = {
				id: generate(),
				sessionId,
				text: payload.retelling
			};
			await tx.insert(classificationRetelling).values(retellingRow);
		}
	});

	return sessionId;
}
