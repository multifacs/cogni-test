/**
 * Unit tests for the ai-survey controller.
 * Uses an in-memory LibSQL database with live Drizzle ORM (pattern of gto tests).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { user } from '$lib/server/db/schema';
import { aiSurvey } from '$lib/server/db/models/ai';

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
import { getAiSurvey, getAiSurveyProgress, upsertAiSurvey } from './ai-survey';

async function seedUser(id: string) {
	await db.insert(user).values({
		id,
		firstname: 'ТЕ',
		lastname: 'УЗ',
		birthday: new Date('1990-01-01'),
		sex: 'male'
	});
}

beforeEach(async () => {
	await db.delete(aiSurvey);
	await db.delete(user);
	await seedUser('u1');
	await seedUser('u2');
});

describe('getAiSurvey', () => {
	it('returns null when the user has no survey row', async () => {
		expect(await getAiSurvey('u1')).toBeNull();
	});

	it('returns parsed answers after upsert', async () => {
		await upsertAiSurvey('u1', {
			q6: { choice: 'Да, ежедневно' },
			q1: { choice: 'Несколько раз в день' }
		});
		const survey = await getAiSurvey('u1');
		expect(survey?.answers).toEqual({
			q6: { choice: 'Да, ежедневно' },
			q1: { choice: 'Несколько раз в день' }
		});
		expect(survey?.userId).toBe('u1');
	});

	it('fails loudly on broken JSON in the answers blob', async () => {
		await db.insert(aiSurvey).values({ userId: 'u2', answers: '{broken json' });
		await expect(getAiSurvey('u2')).rejects.toThrow(/Failed to parse ai_survey answers/);
	});

	it('fails loudly when answers blob is not a JSON object', async () => {
		await db.insert(aiSurvey).values({ userId: 'u2', answers: '"just a string"' });
		await expect(getAiSurvey('u2')).rejects.toThrow(/is not a JSON object/);
	});
});

describe('upsertAiSurvey', () => {
	it('creates a row and overwrites it on the second upsert', async () => {
		const first = await upsertAiSurvey('u1', { q6: { choice: 'Затрудняюсь ответить' } });
		expect(first.answers).toEqual({ q6: { choice: 'Затрудняюсь ответить' } });

		const second = await upsertAiSurvey('u1', { q6: { choice: 'Нет, не использую' } });
		expect(second.answers).toEqual({ q6: { choice: 'Нет, не использую' } });

		// Одна строка на пользователя, ответы перезаписаны.
		const rows = await db.select().from(aiSurvey);
		expect(rows).toHaveLength(1);
		expect(JSON.parse(rows[0].answers)).toEqual({ q6: { choice: 'Нет, не использую' } });
		expect(rows[0].userId).toBe('u1');
	});

	it('keeps surveys of different users separate', async () => {
		await upsertAiSurvey('u1', { q1: { choice: 'A' } });
		await upsertAiSurvey('u2', { q1: { choice: 'B' } });
		const rows = await db.select().from(aiSurvey);
		expect(rows).toHaveLength(2);
	});
});

describe('getAiSurveyProgress', () => {
	it('returns zero progress before the survey is started', async () => {
		expect(await getAiSurveyProgress('u1')).toEqual({
			answered: 0,
			visibleTotal: 36,
			percent: 0
		});
	});

	it('full order (unsure): 3/38 → 7% not passed, 4/38 → 10% passed', async () => {
		await upsertAiSurvey('u1', {
			q6: { choice: 'Затрудняюсь ответить' },
			q1: { choice: 'Несколько раз в день' },
			q2: { choice: 'Менее 1 часа' }
		});
		expect(await getAiSurveyProgress('u1')).toEqual({
			answered: 3,
			visibleTotal: 38,
			percent: 7
		});

		await upsertAiSurvey('u1', {
			q6: { choice: 'Затрудняюсь ответить' },
			q1: { choice: 'Несколько раз в день' },
			q2: { choice: 'Менее 1 часа' },
			q4: { choice: 'Редко получается: уведомления включены, но стараюсь не реагировать сразу' }
		});
		expect(await getAiSurveyProgress('u1')).toEqual({
			answered: 4,
			visibleTotal: 38,
			percent: 10
		});
	});

	it('no branch (28 visible): 3/28 → 10% passed', async () => {
		await upsertAiSurvey('u1', {
			q6: { choice: 'Нет, не использую' },
			q1: { choice: 'Несколько раз в день' },
			q2: { choice: 'Менее 1 часа' }
		});
		expect(await getAiSurveyProgress('u1')).toEqual({
			answered: 3,
			visibleTotal: 28,
			percent: 10
		});
	});

	it('fails loudly on broken JSON (progress reuses getAiSurvey)', async () => {
		await db.insert(aiSurvey).values({ userId: 'u2', answers: '[1,2,' });
		await expect(getAiSurveyProgress('u2')).rejects.toThrow(/Failed to parse ai_survey answers/);
	});
});
