/**
 * Контроллер классификации слов (issue #105, Phase 2, follow-up 2).
 *
 * Двухэтапный тест с серверным state machine:
 *  1. saveClassificationWords  — session (testType 'classification') + группы слов;
 *  2. saveClassificationRetelling — строка пересказа для созданной сессии.
 *
 * Каждый submit слов — НОВАЯ session (не upsert), история попыток сохраняется.
 *
 * Рабочие ограничения (fail-loud, не молча резать):
 * - не более 50 непустых групп;
 * - feature, retelling и каждый элемент words — не более 1000 символов.
 *
 * Группа без слов отбрасывается (пустые groups[].words);
 * feature при непустых словах опциональна (пустая строка допустима).
 * Строка пересказа создаётся ВСЕГДА, даже с пустым текстом (после trim) —
 * это маркер завершения этапа пересказа.
 */
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { classificationWordGroup, classificationRetelling } from '$lib/server/db/models/ai';
import type { InsertClassificationWordGroup } from '$lib/server/db/models/ai';
import { generate } from 'short-uuid';
import { and, eq, sql } from 'drizzle-orm';
import {
	CLASSIFICATION_MAX_TEXT_LENGTH,
	CLASSIFICATION_MAX_GROUPS
} from '$lib/ai/classification-text';

// Лимиты объявлены в клиент-безопасном $lib/ai/classification-text.ts;
// здесь — re-export для стабильности существующего API сервера.
export { CLASSIFICATION_MAX_TEXT_LENGTH, CLASSIFICATION_MAX_GROUPS };

/**
 * Ошибка контроллера с HTTP-статусом для маршрута.
 * Маршрут обязан пробросить message и status как ответ.
 */
export class ControllerError extends Error {
	constructor(
		message: string,
		readonly status: number = 400
	) {
		super(message);
		this.name = 'ControllerError';
	}
}

/** Одна группа слов ответа пользователя. */
export interface ClassificationGroupInput {
	words: string[];
	feature: string;
}

/**
 * Этап state machine теста классификации (re-take семантика, Plan v4 Task 1.2):
 * - 'words'     — старт (или сознательный перезапуск после завершённой истории);
 * - 'retelling' — возврат пользователя mid-flow (latest-сессия ещё без пересказа).
 *
 * Стадии 'complete' НЕТ: завершивший пользователь при заходе на страницу
 * классификации снова получает 'words' — это сознательный re-take, а не ошибка.
 * Признак завершённости для хаба — отдельный hasCompletedClassification().
 */
export interface ClassificationState {
	stage: 'words' | 'retelling';
	sessionId?: string;
}

function assertLength(field: string, value: string): void {
	if (value.length > CLASSIFICATION_MAX_TEXT_LENGTH) {
		throw new ControllerError(
			`${field} exceeds ${CLASSIFICATION_MAX_TEXT_LENGTH} characters (got ${value.length})`
		);
	}
}

/**
 * Этап 1: сохранить слова классификации (session + группы).
 * Возвращает id созданной session.
 */
export async function saveClassificationWords(
	userId: string,
	groups: ClassificationGroupInput[]
): Promise<string> {
	// Пустые группы (0 слов) отбрасываются до лимита и валидации feature.
	const nonEmptyGroups = groups.filter((g) => g.words.length > 0);
	if (nonEmptyGroups.length === 0) {
		// fail-loud: сервер — единственный защитник от orphan-сессии без слов.
		throw new ControllerError('Too few classification groups');
	}
	if (nonEmptyGroups.length > CLASSIFICATION_MAX_GROUPS) {
		throw new ControllerError(
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

		const groupRows: InsertClassificationWordGroup[] = nonEmptyGroups.map((group, index) => ({
			id: generate(),
			sessionId,
			groupIndex: index,
			words: JSON.stringify(group.words),
			feature: group.feature
		}));
		await tx.insert(classificationWordGroup).values(groupRows);
	});

	return sessionId;
}

/**
 * Этап 2: сохранить пересказ для существующей сессии классификации.
 * Строка пересказа создаётся всегда (маркер завершения), даже с пустым текстом.
 */
export async function saveClassificationRetelling(
	userId: string,
	sessionId: string,
	text: string
): Promise<void> {
	assertLength('retelling', text);

	const sess = await db.query.session.findFirst({
		where: (f, { eq }) => eq(f.id, sessionId)
	});
	if (!sess) {
		throw new ControllerError('Classification session not found', 404);
	}
	if (sess.userId !== userId) {
		throw new ControllerError('Classification session belongs to another user', 403);
	}
	if (sess.testType !== 'classification') {
		throw new ControllerError('Session is not a classification session', 400);
	}

	const existing = await db.query.classificationRetelling.findFirst({
		where: (f, { eq }) => eq(f.sessionId, sessionId)
	});
	if (existing) {
		throw new ControllerError('Retelling already submitted for this session', 409);
	}

	await db.insert(classificationRetelling).values({
		id: generate(),
		sessionId,
		text: text.trim()
	});
}

/**
 * Признак завершённости классификации для хаба /ai:
 * EXISTS любая classification-сессия юзера со строкой пересказа
 * (не latest-only: иначе двухвкладочный сценарий теряет завершённую сессию).
 */
export async function hasCompletedClassification(userId: string): Promise<boolean> {
	// EXISTS-подзапрос через join, лимит 1 — достаточно факта.
	const completed = await db
		.select({ id: session.id })
		.from(session)
		.innerJoin(classificationRetelling, eq(classificationRetelling.sessionId, session.id))
		.where(and(eq(session.userId, userId), eq(session.testType, 'classification')))
		.limit(1);
	return completed.length > 0;
}

/**
 * State machine теста классификации для пользователя (re-take семантика):
 *
 * - retelling — последняя сессия (createdAt desc, rowid desc как tie-breaker
 *   по прецеденту gto-latest-session) ещё БЕЗ пересказа: пользователь ушёл
 *   со страницы, не доделав этап 2 — mid-flow защита возвращает его к пересказу
 *   (стимул повторно не показывается);
 * - words — сессий нет (первый заход) ИЛИ latest-сессия уже с пересказом
 *   (завершивший пользователь заходит снова — это сознательный перезапуск,
 *   новая попытка создаётся обычным submit слов).
 *
 * Trade-off двух вкладок: пересказ отправлен на СТАРШЕЙ сессии, а младшая
 * осталась pending → этот метод вернёт 'retelling' для младшей (mid-flow),
 * при этом хаб покажет done (hasCompletedClassification = true по старшей).
 * Страница классификации предложит доделать пересказ младшей сессии.
 */
export async function getClassificationState(userId: string): Promise<ClassificationState> {
	// Последняя classification-сессия без пересказа.
	// createdAt — text с секундной точностью → rowid как обязательный tie-breaker
	// (rowid работает только в однотабличном запросе, поэтому фильтр «нет
	// пересказа» оформлен подзапросом not exists, а не left join).
	const latest = await db
		.select({ id: session.id })
		.from(session)
		.where(
			and(
				eq(session.userId, userId),
				eq(session.testType, 'classification'),
				sql`not exists (select 1 from ${classificationRetelling} where ${classificationRetelling.sessionId} = ${session.id})`
			)
		)
		.orderBy(sql`datetime(${session.createdAt}) desc`, sql`rowid desc`)
		.limit(1);
	if (latest.length > 0) {
		return { stage: 'retelling', sessionId: latest[0].id };
	}

	// Нет сессий вообще, либо latest уже с пересказом → words (re-take).
	return { stage: 'words' };
}
