/**
 * Контроллер анкеты ИИ (таблица ai_survey, одна строка на пользователя).
 *
 * Ответы хранятся JSON-блобом; парсинг выполняется на границе контроллера.
 * На поврежденный JSON контроллер падает громко (fail-loud), а не возвращает
 * null/пустой результат молча.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { aiSurvey } from '$lib/server/db/models/ai';
import type { InsertAiSurvey, SelectAiSurvey } from '$lib/server/db/models/ai';
import { computeAiSurveyProgress, visibleTotal } from '$lib/ai/questionnaire/branching';
import type { AiSurveyAnswers } from '$lib/ai/questionnaire/types';
import type { AiSurveyProgress } from '$lib/ai/questionnaire/branching';

/** Строка анкеты с распарсенным JSON-блобом answers. */
export type AiSurveyRecord = Omit<SelectAiSurvey, 'answers'> & { answers: AiSurveyAnswers };

/**
 * Распарсить JSON-блоб ответов. Fail-loud: бросает понятную ошибку,
 * если JSON поврежден или не является объектом.
 */
export function parseAiSurveyAnswers(raw: string, userId: string): AiSurveyAnswers {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new Error(
			`Failed to parse ai_survey answers JSON for user ${userId}: ${(error as Error).message}`
		);
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`ai_survey answers for user ${userId} is not a JSON object`);
	}
	return parsed as AiSurveyAnswers;
}

/** Прочитать анкету пользователя; null — если анкета еще не заполнялась. */
export async function getAiSurvey(userId: string): Promise<AiSurveyRecord | null> {
	const row = await db.query.aiSurvey.findFirst({
		where: (fields, { eq }) => eq(fields.userId, userId)
	});
	if (!row) {
		return null;
	}
	return { ...row, answers: parseAiSurveyAnswers(row.answers, userId) };
}

/**
 * Создать или полностью перезаписать анкету пользователя (upsert по userId).
 * Возвращает строку с распарсенными ответами.
 */
export async function upsertAiSurvey(
	userId: string,
	answers: AiSurveyAnswers
): Promise<AiSurveyRecord> {
	const payload = JSON.stringify(answers);
	const now = new Date().toISOString();

	const existing = await db.query.aiSurvey.findFirst({
		where: (fields, { eq }) => eq(fields.userId, userId)
	});

	if (existing) {
		const updated = await db
			.update(aiSurvey)
			.set({ answers: payload, updatedAt: now })
			.where(eq(aiSurvey.userId, userId))
			.returning();
		const row = updated[0];
		if (!row) {
			throw new Error(`Failed to update ai_survey for user ${userId}`);
		}
		return { ...row, answers: parseAiSurveyAnswers(row.answers, userId) };
	}

	const inserted = await db
		.insert(aiSurvey)
		.values({ userId, answers: payload } satisfies InsertAiSurvey)
		.returning();
	const row = inserted[0];
	if (!row) {
		throw new Error(`Failed to insert ai_survey for user ${userId}`);
	}
	return { ...row, answers: parseAiSurveyAnswers(row.answers, userId) };
}

/**
 * Прогресс анкеты: { answered, visibleTotal, percent }.
 * percent = floor(answered / visibleTotal * 100); знаменатель — видимые
 * вопросы ветки Q6. Анкета не начата → { answered: 0, visibleTotal: 36, percent: 0 }.
 */
export async function getAiSurveyProgress(userId: string): Promise<AiSurveyProgress> {
	const survey = await getAiSurvey(userId);
	if (!survey) {
		return { answered: 0, visibleTotal: visibleTotal('unanswered'), percent: 0 };
	}
	return computeAiSurveyProgress(survey.answers);
}
