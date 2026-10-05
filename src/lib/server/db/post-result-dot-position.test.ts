/**
 * Integration test for the dot-position DB layer: postResult/getResults
 * over the full drizzle migration chain on an in-memory LibSQL client.
 */
import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session } from './schema';
import { dotPositionAttempt } from './models/exercises';
import type { DotPositionResult } from '$lib/exercises/dot-position/types';

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

const sampleResults: DotPositionResult[] = [
	{ attempt: 1, stage: 1, reactionMs: 420, correct: true, distance: 0.05 },
	{ attempt: 2, stage: 1, reactionMs: 600, correct: false, distance: 0.35 },
	{ attempt: 3, stage: 1, reactionMs: 1500, correct: false, distance: null },
	{ attempt: 4, stage: 2, reactionMs: 380, correct: true, distance: 0.03 },
	{ attempt: 5, stage: 2, reactionMs: 510, correct: false, distance: 0.22 },
	{ attempt: 6, stage: 2, reactionMs: 1400, correct: false, distance: null },
	{ attempt: 7, stage: 3, reactionMs: 350, correct: true, distance: 0.02 },
	{ attempt: 8, stage: 3, reactionMs: 470, correct: true, distance: 0.08 },
	{ attempt: 9, stage: 3, reactionMs: 1300, correct: false, distance: null }
];

describe('postResult dotPosition', () => {
	async function createUser() {
		const [created] = await db
			.insert(user)
			.values({
				firstname: 'Dot',
				lastname: 'Po',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
	}

	it('persists session with meta and 9 attempts, ordered by attempt', async () => {
		const u = await createUser();

		const sessionId = await postResult(
			{ results: sampleResults, meta: { dotsPerStage: '3', windowSize: '0.1' } },
			'dotPosition',
			u.id
		);
		expect(typeof sessionId).toBe('string');

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.testType).toBe('dotPosition');
		expect(sess.meta).toBeTruthy();
		expect(JSON.parse(sess.meta!)).toEqual({ dotsPerStage: '3', windowSize: '0.1' });

		const rows = await db
			.select()
			.from(dotPositionAttempt)
			.where(eq(dotPositionAttempt.sessionId, sessionId));
		expect(rows.length).toBe(9);

		// getResults returns attempts ordered asc(attempt)
		const results = await getResults('dotPosition', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === sessionId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as (typeof sampleResults)[number][];
		expect(attempts.length).toBe(9);
		expect(attempts.map((a) => a.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(attempts[0].stage).toBe(1);
		expect(attempts[8].stage).toBe(3);

		// correct stored as boolean 0/1 (drizzle boolean mode)
		expect(attempts[0].correct).toBe(true);
		expect(attempts[1].correct).toBe(false);

		// distance is nullable (no-tap rounds)
		expect(attempts.filter((a) => a.distance === null).length).toBe(3);
		expect(attempts[2].distance).toBeNull();
		expect(attempts[0].distance).toBeCloseTo(0.05);
	});

	it('stores raw column values the schema expects', async () => {
		const u = await createUser();

		const sessionId = await postResult(sampleResults, 'dotPosition', u.id);

		const rows = await db
			.select()
			.from(dotPositionAttempt)
			.where(eq(dotPositionAttempt.sessionId, sessionId));
		expect(rows.length).toBe(9);
		expect(rows[2].distance).toBeNull();
		expect(rows[0].correct).toBe(true);
		expect(rows[1].correct).toBe(false);
	});

	it('does NOT duplicate attempts when the same sessionId is posted twice', async () => {
		const u = await createUser();
		const customId = 'dot-position-sess-id-1';

		const s1 = await postResult(sampleResults, 'dotPosition', u.id, customId);
		expect(s1).toBe(customId);

		const rows1 = await db
			.select()
			.from(dotPositionAttempt)
			.where(eq(dotPositionAttempt.sessionId, customId));
		expect(rows1.length).toBe(9);

		// second call with same id
		const s2 = await postResult(sampleResults, 'dotPosition', u.id, customId);
		expect(s2).toBe(customId);

		// no duplication: still 9 attempts, not 18
		const rows2 = await db
			.select()
			.from(dotPositionAttempt)
			.where(eq(dotPositionAttempt.sessionId, customId));
		expect(rows2.length).toBe(9);

		// session is not duplicated either
		const sessions = await db.select().from(session).where(eq(session.id, customId));
		expect(sessions.length).toBe(1);

		// getResults returns the same data
		const results = await getResults('dotPosition', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === customId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as (typeof sampleResults)[number][];
		expect(attempts.length).toBe(9);
		expect(attempts.map((a) => a.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});
});
