/**
 * Integration test for the rotation DB layer: postResult/getResults
 * over the full drizzle migration chain on an in-memory LibSQL client.
 */
import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session } from './schema';
import { rotationAttempt } from './models/exercises';
import type { RotationAnswerRow } from '$lib/exercises/rotation/types';

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

const sampleResults: RotationAnswerRow[] = [
	{
		taskIndex: 1,
		difficultyLevel: 1,
		gridSize: 3,
		selectedIndex: 0,
		correctIndex: 0,
		isCorrect: true,
		responseTimeMs: 2100,
		timedOut: false,
		seed: 'seed-1'
	},
	{
		taskIndex: 2,
		difficultyLevel: 1,
		gridSize: 3,
		selectedIndex: 2,
		correctIndex: 1,
		isCorrect: false,
		responseTimeMs: 3400,
		timedOut: false,
		seed: 'seed-2'
	},
	{
		taskIndex: 3,
		difficultyLevel: 1,
		gridSize: 3,
		selectedIndex: null,
		correctIndex: 3,
		isCorrect: false,
		responseTimeMs: 10000,
		timedOut: true,
		seed: 'seed-3'
	},
	{
		taskIndex: 4,
		difficultyLevel: 2,
		gridSize: 4,
		selectedIndex: 1,
		correctIndex: 1,
		isCorrect: true,
		responseTimeMs: 4200,
		timedOut: false,
		seed: 'seed-4'
	},
	{
		taskIndex: 5,
		difficultyLevel: 2,
		gridSize: 4,
		selectedIndex: 0,
		correctIndex: 2,
		isCorrect: false,
		responseTimeMs: 5600,
		timedOut: false,
		seed: 'seed-5'
	},
	{
		taskIndex: 6,
		difficultyLevel: 2,
		gridSize: 4,
		selectedIndex: 3,
		correctIndex: 3,
		isCorrect: true,
		responseTimeMs: 3900,
		timedOut: false,
		seed: 'seed-6'
	},
	{
		taskIndex: 7,
		difficultyLevel: 3,
		gridSize: 6,
		selectedIndex: null,
		correctIndex: 1,
		isCorrect: false,
		responseTimeMs: 10000,
		timedOut: true,
		seed: 'seed-7'
	},
	{
		taskIndex: 8,
		difficultyLevel: 3,
		gridSize: 6,
		selectedIndex: 2,
		correctIndex: 2,
		isCorrect: true,
		responseTimeMs: 7300,
		timedOut: false,
		seed: 'seed-8'
	},
	{
		taskIndex: 9,
		difficultyLevel: 3,
		gridSize: 6,
		selectedIndex: 4,
		correctIndex: 4,
		isCorrect: true,
		responseTimeMs: 6800,
		timedOut: false,
		seed: 'seed-9'
	}
];

describe('postResult rotation', () => {
	async function createUser() {
		const [created] = await db
			.insert(user)
			.values({
				firstname: 'Ro',
				lastname: 'Ta',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
	}

	it('persists session with 9 attempts ordered by taskIndex, fields round-trip', async () => {
		const u = await createUser();

		const sessionId = await postResult(
			{ results: sampleResults, meta: { totalTasks: '9', timeLimitMs: '10000' } },
			'rotation',
			u.id
		);
		expect(typeof sessionId).toBe('string');

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.testType).toBe('rotation');
		expect(sess.meta).toBeTruthy();
		expect(JSON.parse(sess.meta!)).toEqual({ totalTasks: '9', timeLimitMs: '10000' });

		const rows = await db
			.select()
			.from(rotationAttempt)
			.where(eq(rotationAttempt.sessionId, sessionId));
		expect(rows.length).toBe(9);

		const results = await getResults('rotation', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === sessionId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as RotationAnswerRow[];
		expect(attempts.length).toBe(9);
		expect(attempts.map((a) => a.taskIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

		// booleans round-trip through drizzle boolean mode
		expect(attempts[0].isCorrect).toBe(true);
		expect(attempts[1].isCorrect).toBe(false);
		expect(attempts[6].timedOut).toBe(true);
		expect(attempts[0].timedOut).toBe(false);

		// timeout row keeps selectedIndex null, others keep their value
		expect(attempts[2].selectedIndex).toBeNull();
		expect(attempts[6].selectedIndex).toBeNull();
		expect(attempts[0].selectedIndex).toBe(0);
		expect(attempts[3].selectedIndex).toBe(1);

		// difficulty/grid pairing and remaining fields
		expect(attempts.map((a) => a.difficultyLevel)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
		expect(attempts.map((a) => a.gridSize)).toEqual([3, 3, 3, 4, 4, 4, 6, 6, 6]);
		expect(attempts[4].correctIndex).toBe(2);
		expect(attempts[5].responseTimeMs).toBe(3900);
		expect(attempts[7].seed).toBe('seed-8');
	});

	it('does NOT duplicate attempts when the same sessionId is posted twice', async () => {
		const u = await createUser();
		const customId = 'rotation-sess-id-1';

		const s1 = await postResult(sampleResults, 'rotation', u.id, customId);
		expect(s1).toBe(customId);

		const rows1 = await db
			.select()
			.from(rotationAttempt)
			.where(eq(rotationAttempt.sessionId, customId));
		expect(rows1.length).toBe(9);

		// second call with same id
		const s2 = await postResult(sampleResults, 'rotation', u.id, customId);
		expect(s2).toBe(customId);

		// no duplication: still 9 attempts, not 18
		const rows2 = await db
			.select()
			.from(rotationAttempt)
			.where(eq(rotationAttempt.sessionId, customId));
		expect(rows2.length).toBe(9);

		// session is not duplicated either
		const sessions = await db.select().from(session).where(eq(session.id, customId));
		expect(sessions.length).toBe(1);

		// getResults returns the same data
		const results = await getResults('rotation', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === customId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as RotationAnswerRow[];
		expect(attempts.length).toBe(9);
		expect(attempts.map((a) => a.taskIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});
});
