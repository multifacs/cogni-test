/**
 * Unit tests for the two-stage classification controller.
 * Uses an in-memory LibSQL database with live Drizzle ORM (pattern of ai-survey/gto tests).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { user, session } from '$lib/server/db/schema';
import { classificationWordGroup, classificationRetelling } from '$lib/server/db/models/ai';

vi.mock('$lib/server/db', async () => {
	const { drizzle } = await import('drizzle-orm/libsql');
	const { createClient } = await import('@libsql/client');
	const { migrate } = await import('drizzle-orm/libsql/migrator');
	const schema = await import('$lib/server/db/schema');
	const { fileURLToPath } = await import('node:url');
	const { dirname, join } = await import('node:path');

	const client = createClient({ url: ':memory:' });
	const db = drizzle(client, { schema });
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const migrationsFolder = join(__dirname, '../../../../../drizzle');
	await migrate(db, { migrationsFolder });

	return { db };
});

import { db } from '$lib/server/db';
import {
	saveClassificationWords,
	saveClassificationRetelling,
	getClassificationState,
	hasCompletedClassification,
	ControllerError
} from './classification';

async function seedUser(id: string) {
	await db.insert(user).values({
		id,
		firstname: 'ТЕ',
		lastname: 'УЗ',
		birthday: new Date('1990-01-01'),
		sex: 'male'
	});
}

function makeGroups(groups: Array<{ words: string[]; feature?: string }>) {
	return groups.map((g) => ({ words: g.words, feature: g.feature ?? '' }));
}

beforeEach(async () => {
	await db.delete(classificationRetelling);
	await db.delete(classificationWordGroup);
	await db.delete(session);
	await db.delete(user);
	await seedUser('u1');
	await seedUser('u2');
});

describe('saveClassificationWords (этап 1)', () => {
	it('creates a session with testType classification and saves groups', async () => {
		const sessionId = await saveClassificationWords(
			'u1',
			makeGroups([
				{ words: ['овец', 'стадо'], feature: 'животные' },
				{ words: ['шкатулка', 'бусинка'], feature: 'предметы' }
			])
		);

		const sess = await db.query.session.findFirst({
			where: (f, { eq }) => eq(f.id, sessionId)
		});
		expect(sess?.testType).toBe('classification');
		expect(sess?.userId).toBe('u1');

		const groups = await db
			.select()
			.from(classificationWordGroup)
			.orderBy(classificationWordGroup.groupIndex);
		expect(groups).toHaveLength(2);
		expect(groups[0].sessionId).toBe(sessionId);
		expect(groups[0].groupIndex).toBe(0);
		expect(JSON.parse(groups[0].words)).toEqual(['овец', 'стадо']);
		expect(groups[0].feature).toBe('животные');
		expect(groups[1].groupIndex).toBe(1);
		expect(JSON.parse(groups[1].words)).toEqual(['шкатулка', 'бусинка']);

		// Этап 1 не создаёт строку пересказа — за неё отвечает этап 2.
		expect(await db.select().from(classificationRetelling)).toHaveLength(0);
	});

	it('discards empty groups and does not leave gaps in groupIndex', async () => {
		const sessionId = await saveClassificationWords(
			'u1',
			makeGroups([
				{ words: [], feature: 'пустая' },
				{ words: ['овец'], feature: '' },
				{ words: ['шкатулка'], feature: 'x' }
			])
		);

		const groups = await db
			.select()
			.from(classificationWordGroup)
			.orderBy(classificationWordGroup.groupIndex);
		expect(groups).toHaveLength(2);
		expect(groups.map((g) => g.groupIndex)).toEqual([0, 1]);
		expect(groups[0].words).toContain('овец');
		// feature опциональна при непустых словах
		expect(groups[0].feature).toBe('');
		expect(groups.every((g) => g.sessionId === sessionId)).toBe(true);
	});

	it('a repeated submit creates a NEW session (no upsert)', async () => {
		const first = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		const second = await saveClassificationWords('u1', makeGroups([{ words: ['шкатулка'] }]));

		expect(second).not.toBe(first);
		const sessions = await db.select().from(session);
		expect(sessions).toHaveLength(2);
	});

	it('throws ControllerError 400 when all groups are empty (fail-loud, no orphan session)', async () => {
		await expect(
			saveClassificationWords('u1', makeGroups([{ words: [], feature: 'x' }]))
		).rejects.toThrow(ControllerError);
		await expect(saveClassificationWords('u1', makeGroups([{ words: [] }]))).rejects.toThrow(
			/Too few classification groups/
		);
		// Ничего не персистится — orphan-сессия с 0 слов недопустима.
		expect(await db.select().from(session)).toHaveLength(0);
		expect(await db.select().from(classificationWordGroup)).toHaveLength(0);
	});

	it('throws loudly when there are more than 50 non-empty groups', async () => {
		const groups = makeGroups(
			Array.from({ length: 51 }, (_, i) => ({ words: [`w${i}`], feature: 'f' }))
		);
		await expect(saveClassificationWords('u1', groups)).rejects.toThrow(/50/i);
		expect(await db.select().from(session)).toHaveLength(0);
	});

	it('accepts exactly 50 non-empty groups', async () => {
		const groups = makeGroups(
			Array.from({ length: 50 }, (_, i) => ({ words: [`w${i}`], feature: 'f' }))
		);
		const sessionId = await saveClassificationWords('u1', groups);
		const saved = await db.select().from(classificationWordGroup);
		expect(saved).toHaveLength(50);
		expect(saved.every((g) => g.sessionId === sessionId)).toBe(true);
	});

	it('throws when a feature exceeds 1000 characters', async () => {
		await expect(
			saveClassificationWords(
				'u1',
				makeGroups([{ words: ['овец'], feature: 'ф'.repeat(1001) }])
			)
		).rejects.toThrow(/1000/);
	});

	it('throws when any single word exceeds 1000 characters (working limit)', async () => {
		await expect(
			saveClassificationWords('u1', makeGroups([{ words: ['ф'.repeat(1001)] }]))
		).rejects.toThrow(/1000/);
	});

	it('does not persist anything when validation fails', async () => {
		await expect(
			saveClassificationWords(
				'u1',
				makeGroups([{ words: ['овец'] }, { words: ['ф'.repeat(1001)] }])
			)
		).rejects.toThrow();
		expect(await db.select().from(session)).toHaveLength(0);
		expect(await db.select().from(classificationWordGroup)).toHaveLength(0);
	});
});

describe('saveClassificationRetelling (этап 2)', () => {
	it('creates the retelling row for the given session', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await saveClassificationRetelling('u1', sessionId, 'пастух наблюдал за овцами');

		const retellings = await db.select().from(classificationRetelling);
		expect(retellings).toHaveLength(1);
		expect(retellings[0].sessionId).toBe(sessionId);
		expect(retellings[0].text).toBe('пастух наблюдал за овцами');
	});

	it('creates the retelling row even for an empty text (stage completion marker)', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await saveClassificationRetelling('u1', sessionId, '');

		const retellings = await db.select().from(classificationRetelling);
		expect(retellings).toHaveLength(1);
		expect(retellings[0].text).toBe('');
	});

	it('trims the retelling text before saving', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await saveClassificationRetelling('u1', sessionId, '  текст  ');
		const retellings = await db.select().from(classificationRetelling);
		expect(retellings[0].text).toBe('текст');
	});

	it('throws 404 when the session does not exist', async () => {
		const err = await saveClassificationRetelling('u1', 'missing', 'текст').catch((e) => e);
		expect(err).toBeInstanceOf(ControllerError);
		expect((err as ControllerError).status).toBe(404);
	});

	it('throws 403 when the session belongs to another user', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		const err = await saveClassificationRetelling('u2', sessionId, 'текст').catch((e) => e);
		expect(err).toBeInstanceOf(ControllerError);
		expect((err as ControllerError).status).toBe(403);
		// Чужая вставка не произошла.
		expect(await db.select().from(classificationRetelling)).toHaveLength(0);
	});

	it('throws 409 when the retelling is already submitted', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await saveClassificationRetelling('u1', sessionId, 'первый');
		const err = await saveClassificationRetelling('u1', sessionId, 'второй').catch((e) => e);
		expect(err).toBeInstanceOf(ControllerError);
		expect((err as ControllerError).status).toBe(409);
		// Старый текст не перезатёрт.
		const retellings = await db.select().from(classificationRetelling);
		expect(retellings).toHaveLength(1);
		expect(retellings[0].text).toBe('первый');
	});

	it('throws when the retelling exceeds 1000 characters', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await expect(
			saveClassificationRetelling('u1', sessionId, 'ф'.repeat(1001))
		).rejects.toThrow(/1000/);
	});

	it('throws when the session is not a classification session', async () => {
		await db.insert(session).values({ id: 'other', userId: 'u1', testType: 'math' });
		const err = await saveClassificationRetelling('u1', 'other', 'текст').catch((e) => e);
		expect(err).toBeInstanceOf(ControllerError);
		expect((err as ControllerError).status).toBe(400);
	});
});

describe('getClassificationState (state machine, re-take семантика)', () => {
	it('returns words when the user has no classification sessions', async () => {
		await expect(getClassificationState('u1')).resolves.toEqual({ stage: 'words' });
		expect(await hasCompletedClassification('u1')).toBe(false);
	});

	it('returns retelling with the latest session id after words are submitted', async () => {
		const older = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		const newer = await saveClassificationWords('u1', makeGroups([{ words: ['шкатулка'] }]));

		const state = await getClassificationState('u1');
		expect(state.stage).toBe('retelling');
		// latest: вторая сессия новее (rowid больше при одинаковой секундной точности createdAt)
		expect(state.sessionId).toBe(newer);
		expect(state.sessionId).not.toBe(older);
		// попытка не завершена — пересказа нет
		expect(await hasCompletedClassification('u1')).toBe(false);
	});

	it('retelling submitted → words again (сознательный re-take) + hasCompleted=true', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await saveClassificationRetelling('u1', sessionId, 'текст');

		await expect(getClassificationState('u1')).resolves.toEqual({ stage: 'words' });
		expect(await hasCompletedClassification('u1')).toBe(true);
	});

	it('hasCompleted=true even when the retelling text is empty (пустой пересказ — маркер завершения)', async () => {
		const sessionId = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await saveClassificationRetelling('u1', sessionId, '');

		await expect(getClassificationState('u1')).resolves.toEqual({ stage: 'words' });
		expect(await hasCompletedClassification('u1')).toBe(true);
	});

	it('ORPHAN CASE: старшая с retelling, младшая pending → state retelling (младшая) + hasCompleted=true', async () => {
		const s1 = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		const s2 = await saveClassificationWords('u1', makeGroups([{ words: ['шкатулка'] }]));

		// Двухвкладочный сценарий: retelling пришёл на СТАРУЮ сессию (S1).
		await saveClassificationRetelling('u1', s1, 'текст из первой вкладки');

		// mid-flow защита: младшая S2 без пересказа → пользователь должен её доделать.
		await expect(getClassificationState('u1')).resolves.toEqual({
			stage: 'retelling',
			sessionId: s2
		});
		// но завершённость уже есть (хаб покажет done по любой сессии).
		expect(await hasCompletedClassification('u1')).toBe(true);
	});

	it('returns retelling for user A while user B has a completed session (per-user isolation)', async () => {
		const a = await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		const b = await saveClassificationWords('u2', makeGroups([{ words: ['шкатулка'] }]));
		await saveClassificationRetelling('u2', b, 'текст');

		await expect(getClassificationState('u1')).resolves.toEqual({
			stage: 'retelling',
			sessionId: a
		});
		expect(await hasCompletedClassification('u1')).toBe(false);
		expect(await hasCompletedClassification('u2')).toBe(true);
	});

	it('returns words for a user with no sessions while another user has ones', async () => {
		await saveClassificationWords('u1', makeGroups([{ words: ['овец'] }]));
		await expect(getClassificationState('u2')).resolves.toEqual({ stage: 'words' });
	});
});

describe('two-stage flow (integration, re-take)', () => {
	it('words → retelling → words (re-take) с hasCompleted-переключателем', async () => {
		await expect(getClassificationState('u1')).resolves.toEqual({ stage: 'words' });

		const sessionId = await saveClassificationWords(
			'u1',
			makeGroups([{ words: ['овец', 'стадо'], feature: 'животные' }])
		);

		const mid = await getClassificationState('u1');
		expect(mid).toEqual({ stage: 'retelling', sessionId });

		await saveClassificationRetelling('u1', sessionId, 'пастух и овцы');

		// завершение ≠ тупик: следующий заход — сознательный перезапуск
		await expect(getClassificationState('u1')).resolves.toEqual({ stage: 'words' });
		expect(await hasCompletedClassification('u1')).toBe(true);
	});
});
