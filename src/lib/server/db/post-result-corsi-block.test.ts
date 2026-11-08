/**
 * Integration test for the corsi-block DB layer: postResult/getResults
 * over the full drizzle migration chain on an in-memory LibSQL client.
 */
import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session } from './schema';
import { corsiBlockAttempt } from './models/exercises';
import type { CorsiBlockResult } from '$lib/exercises/corsi-block/types';

vi.mock('$lib/server/db', async () => {
	const { drizzle } = await import('drizzle-orm/libsql');
	const { createClient } = await import('@libsql/client');
	const { migrate } = await import('drizzle-orm/libsql/migrator');
	const schema = await import('./schema');
	const { fileURLToPath } = await import('node:url');
	const { dirname, join } = await import('node:path');

	const client = createClient({ url: ':memory:' });
	const db = drizzle(client, { schema });
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const migrationsFolder = join(__dirname, '../../../../drizzle');
	await migrate(db, { migrationsFolder });

	return { db };
});

import { postResult, getResults } from './controllers/result';
import { db } from '$lib/server/db';

const sampleResults: CorsiBlockResult[] = [
	{ attempt: 1, sequenceLength: 3, isCorrect: true, answerMs: 2100 },
	{ attempt: 2, sequenceLength: 4, isCorrect: true, answerMs: 2600 },
	{ attempt: 3, sequenceLength: 5, isCorrect: false, answerMs: 900 },
	// Ретрай той же длины после ошибки (вариант B движка)
	{ attempt: 4, sequenceLength: 5, isCorrect: false, answerMs: 15000 },
	{ attempt: 5, sequenceLength: 5, isCorrect: true, answerMs: 4100 },
	{ attempt: 6, sequenceLength: 6, isCorrect: false, answerMs: 700 },
	{ attempt: 7, sequenceLength: 6, isCorrect: false, answerMs: 15000 },
	{ attempt: 8, sequenceLength: 6, isCorrect: true, answerMs: 5300 },
	{ attempt: 9, sequenceLength: 7, isCorrect: false, answerMs: 1200 }
];

describe('postResult corsiBlock', () => {
	async function createUser() {
		const [created] = await db
			.insert(user)
			.values({
				firstname: 'Corsi',
				lastname: 'Cb',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
	}

	it('persists session with meta and 9 attempts, ordered by attempt', async () => {
		const u = await createUser();

		const sessionId = await postResult(
			{
				results: sampleResults,
				meta: { rounds: '9', startLength: '3', answerTimeoutMs: '15000' }
			},
			'corsiBlock',
			u.id
		);
		expect(typeof sessionId).toBe('string');

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.testType).toBe('corsiBlock');
		expect(sess.meta).toBeTruthy();
		expect(JSON.parse(sess.meta!)).toEqual({
			rounds: '9',
			startLength: '3',
			answerTimeoutMs: '15000'
		});

		const rows = await db
			.select()
			.from(corsiBlockAttempt)
			.where(eq(corsiBlockAttempt.sessionId, sessionId));
		expect(rows.length).toBe(9);

		// getResults returns attempts ordered asc(attempt)
		const results = await getResults('corsiBlock', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === sessionId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as (typeof sampleResults)[number][];
		expect(attempts.length).toBe(9);
		expect(attempts.map((a) => a.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(attempts[0].sequenceLength).toBe(3);
		expect(attempts[8].sequenceLength).toBe(7);

		// isCorrect stored as boolean 0/1 (drizzle boolean mode)
		expect(attempts[0].isCorrect).toBe(true);
		expect(attempts[2].isCorrect).toBe(false);

		// answerMs: таймаут-заходы тарифицированы как полный таймаут
		expect(attempts[3].answerMs).toBe(15000);
		expect(attempts[6].answerMs).toBe(15000);
		expect(attempts[0].answerMs).toBe(2100);

		// Ретраи: та же длина после ошибки
		expect(attempts[3].sequenceLength).toBe(attempts[2].sequenceLength);
		expect(attempts[6].sequenceLength).toBe(attempts[5].sequenceLength);
	});

	it('stores raw column values the schema expects', async () => {
		const u = await createUser();

		const sessionId = await postResult(sampleResults, 'corsiBlock', u.id);

		const rows = await db
			.select()
			.from(corsiBlockAttempt)
			.where(eq(corsiBlockAttempt.sessionId, sessionId));
		expect(rows.length).toBe(9);
		expect(rows[0].isCorrect).toBe(true);
		expect(rows[2].isCorrect).toBe(false);
		expect(rows[3].answerMs).toBe(15000);
		expect(rows.every((r) => r.sessionId === sessionId)).toBe(true);
	});

	it('does NOT duplicate attempts when the same sessionId is posted twice', async () => {
		const u = await createUser();
		const customId = 'corsi-block-sess-id-1';

		const s1 = await postResult(sampleResults, 'corsiBlock', u.id, customId);
		expect(s1).toBe(customId);

		const rows1 = await db
			.select()
			.from(corsiBlockAttempt)
			.where(eq(corsiBlockAttempt.sessionId, customId));
		expect(rows1.length).toBe(9);

		// second call with same id
		const s2 = await postResult(sampleResults, 'corsiBlock', u.id, customId);
		expect(s2).toBe(customId);

		// no duplication: still 9 attempts, not 18
		const rows2 = await db
			.select()
			.from(corsiBlockAttempt)
			.where(eq(corsiBlockAttempt.sessionId, customId));
		expect(rows2.length).toBe(9);

		// session is not duplicated either
		const sessions = await db.select().from(session).where(eq(session.id, customId));
		expect(sessions.length).toBe(1);

		// getResults returns the same data
		const results = await getResults('corsiBlock', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === customId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as (typeof sampleResults)[number][];
		expect(attempts.length).toBe(9);
		expect(attempts.map((a) => a.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});
});
