/**
 * Regression test for the meta-persist mechanism in `postResult`.
 * Uses an in-memory LibSQL client with Drizzle migrations.
 */
import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session } from './schema';
import { rhythmAttempt } from './models/exercises';
import type { RhythmResult } from '$lib/exercises/rhythm/types';

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

import { postResult, getResults, getSessionList } from './controllers/result';
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

const sampleRhythmRow: RhythmResult = {
	attempt: 1000,
	note: 1020
};

describe('postResult meta-persist', () => {
	async function createUser() {
		const [created] = await db
			.insert(user)
			.values({
				firstname: 'Me',
				lastname: 'Ta',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
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

	describe('postResult idempotency (rhythm)', () => {
		async function createUser(firstname: string) {
			const [created] = await db
				.insert(user)
				.values({
					firstname,
					lastname: 'Ta',
					birthday: new Date(),
					sex: 'male'
				})
				.returning();
			return created;
		}

	it('does NOT duplicate attempts when the same sessionId is posted twice (rhythm)', async () => {
		const u = await createUser('A');
		const customId = 'rhythm-sess-id-1';

		const s1 = await postResult([sampleRhythmRow], 'rhythm', u.id, customId);
		expect(s1).toBe(customId);

		const rows1 = await db
			.select()
			.from(rhythmAttempt)
			.where(eq(rhythmAttempt.sessionId, customId));
		expect(rows1.length).toBe(1);

		// second call with same id
		const s2 = await postResult([sampleRhythmRow, sampleRhythmRow], 'rhythm', u.id, customId);
		expect(s2).toBe(customId);

		const rows2 = await db
			.select()
			.from(rhythmAttempt)
			.where(eq(rhythmAttempt.sessionId, customId));
		expect(rows2.length).toBe(1); // no duplication
	});

	it('backfills attempts on half-crash session row without attempts', async () => {
		const u = await createUser('B');
		const customId = 'rhythm-sess-id-2';

		await db.insert(session).values({
			id: customId,
			testType: 'rhythm',
			userId: u.id,
			meta: null
		});

		const rowsBefore = await db
			.select()
			.from(rhythmAttempt)
			.where(eq(rhythmAttempt.sessionId, customId));
		expect(rowsBefore.length).toBe(0);

		const s = await postResult([sampleRhythmRow], 'rhythm', u.id, customId);
		expect(s).toBe(customId);

		const rowsAfter = await db
			.select()
			.from(rhythmAttempt)
			.where(eq(rhythmAttempt.sessionId, customId));
		expect(rowsAfter.length).toBe(1);
		expect(rowsAfter[0].attempt).toBe(sampleRhythmRow.attempt);
	});

	it('throws when retrying with a different userId for the same sessionId', async () => {
		const u1 = await createUser('C1');
		const u2 = await createUser('C2');
		const customId = 'rhythm-sess-id-3';

		await postResult([sampleRhythmRow], 'rhythm', u1.id, customId);

		await expect(postResult([sampleRhythmRow], 'rhythm', u2.id, customId)).rejects.toThrow(
			'belongs to a different user'
		);
	});
});

describe('getSessionList', () => {
	async function createUser(firstname: string) {
		const [created] = await db
			.insert(user)
			.values({
				firstname,
				lastname: 'Ta',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
	}

	it('returns sessions filtered by testType and userId, ordered createdAt desc, without attempts', async () => {
		const u1 = await createUser('A');
		const u2 = await createUser('B');

		const s1 = await postResult([sampleRhythmRow], 'rhythm', u1.id);
		const s2 = await postResult([sampleRhythmRow], 'rhythm', u1.id);
		const s3 = await postResult([sampleFlankerRow], 'flanker', u1.id);
		const s4 = await postResult([sampleRhythmRow], 'rhythm', u2.id);

		const list = await getSessionList('rhythm', u1.id);
		expect(list.length).toBe(2);
		expect(list.map((l) => l.id)).toContain(s1);
		expect(list.map((l) => l.id)).toContain(s2);
		expect(new Date(list[0].createdAt).getTime()).toBeGreaterThanOrEqual(
			new Date(list[1].createdAt).getTime()
		);

		for (const item of list) {
			expect(item).toHaveProperty('id');
			expect(item).toHaveProperty('meta');
			expect(item).toHaveProperty('createdAt');
			expect(item).not.toHaveProperty('attempts');
			expect(item).not.toHaveProperty('userId');
			expect(item).not.toHaveProperty('testType');
		}

		expect(await getSessionList('flanker', u1.id)).toHaveLength(1);
		expect(await getSessionList('rhythm', u2.id)).toHaveLength(1);
		expect((await getSessionList('rhythm', u2.id))[0].id).toBe(s4);
	});
});
