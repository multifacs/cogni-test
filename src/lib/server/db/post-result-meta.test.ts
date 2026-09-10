/**
 * Regression test for the meta-persist mechanism in `postResult`.
 * Uses an in-memory LibSQL client with Drizzle migrations.
 */
import { describe, it, expect, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { user, session } from './schema';

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
import { flankerAttempt } from './models/exercises';
import type { FlankerTrialRow } from '$lib/exercises/flanker/types';

const sampleFlankerRow: FlankerTrialRow = {
	trialIndex: 0,
	target: 'left',
	selected: 'left',
	isCorrect: true,
	congruent: true,
	reactionTimeMs: 350,
	timeLimit: false,
	elapsedTime: 350
};

describe('postResult meta-persist', () => {
	async function createUser() {
		await db.insert(user).values({
			firstname: 'Me',
			lastname: 'Ta',
			birthday: new Date(),
			sex: 'male'
		});

		const [lastUser] = await db
			.select()
			.from(user)
			.orderBy(sql`${user.lastActiveAt} DESC`)
			.limit(1);

		return lastUser;
	}

	it('persists MetaResult.meta into session.meta and returns it via getResults', async () => {
		const u = await createUser();

		const sessionId = await postResult(
			{ meta: { overpress: '2' }, results: [sampleFlankerRow] },
			'flanker',
			u.id
		);

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.testType).toBe('flanker');
		expect(sess.meta).toBeTruthy();
		expect(JSON.parse(sess.meta!)).toEqual({ overpress: '2' });

		const attempts = await db
			.select()
			.from(flankerAttempt)
			.where(eq(flankerAttempt.sessionId, sessionId));
		expect(attempts.length).toBe(1);
		expect(attempts[0].target).toBe('left');
		expect(attempts[0].isCorrect).toBe(true);

		const results = await getResults('flanker', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === sessionId);
		expect(found).toBeDefined();
		expect(found!.meta).toEqual({ overpress: '2' });
	});

	it('leaves session.meta null when posting plain results (no meta)', async () => {
		const u = await createUser();

		const sessionId = await postResult([sampleFlankerRow], 'flanker', u.id);

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.meta).toBeNull();
	});
});
