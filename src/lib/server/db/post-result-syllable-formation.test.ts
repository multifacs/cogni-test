/**
 * Integration test for the syllable-formation DB layer: postResult/getResults
 * over the full drizzle migration chain on an in-memory LibSQL client.
 */
import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session } from './schema';
import { syllableFormationAttempt } from './models/exercises';
import type { SyllableFormationAttemptRow } from '$lib/exercises/syllable-formation/types';

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

// Сессия: 5 псевдословосочетаний. Вариант с association: null (таймаут
// на этапе придумывания) и timedOut: true (таймаут восстановления).
const sampleResults: SyllableFormationAttemptRow[] = [
	{
		pairIndex: 1,
		phrase: 'ба-ко-ми ло-те-су',
		association: 'бабушка у моря',
		isCorrect: true,
		reactionTimeMs: 4200,
		timedOut: false,
		associationMs: 15000,
		recalledPhrase: 'ба-ко-ми ло-те-су'
	},
	{
		pairIndex: 2,
		phrase: 'во-ру-та па-си-ко',
		association: 'ворота в парке',
		isCorrect: false,
		reactionTimeMs: 9800,
		timedOut: false,
		associationMs: 21000,
		recalledPhrase: 'во-ру-та па-ки-со'
	},
	{
		pairIndex: 3,
		phrase: 'лу-то-шра ми-на-ве',
		association: null,
		isCorrect: false,
		reactionTimeMs: 120000,
		timedOut: true,
		associationMs: 120000,
		recalledPhrase: null
	},
	{
		pairIndex: 4,
		phrase: 'ро-ка-дю не-би-ло',
		association: 'рокадный небосклон',
		isCorrect: true,
		reactionTimeMs: 3100,
		timedOut: false,
		associationMs: 12000,
		recalledPhrase: 'ро-ка-дю не-би-ло'
	},
	{
		pairIndex: 5,
		phrase: 'та-со-ми ву-ло-ке',
		association: 'таксомотор',
		isCorrect: false,
		reactionTimeMs: 7600,
		timedOut: true,
		associationMs: 18000,
		recalledPhrase: 'та-со-ми во-лу-ке'
	}
];

describe('postResult syllableFormation', () => {
	async function createUser() {
		const [created] = await db
			.insert(user)
			.values({
				firstname: 'Syllable',
				lastname: 'Sf',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
	}

	it('persists session and 5 attempts, ordered by pairIndex; null association stays null', async () => {
		const u = await createUser();

		const sessionId = await postResult(sampleResults, 'syllableFormation', u.id);
		expect(typeof sessionId).toBe('string');

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.testType).toBe('syllableFormation');
		expect(sess.meta).toBeNull();

		const rows = await db
			.select()
			.from(syllableFormationAttempt)
			.where(eq(syllableFormationAttempt.sessionId, sessionId));
		expect(rows.length).toBe(5);

		// getResults returns attempts ordered asc(pairIndex) 1..5
		const results = await getResults('syllableFormation', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === sessionId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as SyllableFormationAttemptRow[];
		expect(attempts.length).toBe(5);
		expect(attempts.map((a) => a.pairIndex)).toEqual([1, 2, 3, 4, 5]);

		// isCorrect stored via drizzle boolean mode
		expect(attempts[0].isCorrect).toBe(true);
		expect(attempts[2].isCorrect).toBe(false);
		expect(attempts[4].timedOut).toBe(true);
		expect(attempts[0].timedOut).toBe(false);

		// association null persists as null; non-null as string
		expect(attempts[2].association).toBeNull();
		expect(attempts[0].association).toBe('бабушка у моря');

		// recalledPhrase round-trips (including null)
		expect(attempts[0].recalledPhrase).toBe('ба-ко-ми ло-те-су');
		expect(attempts[2].recalledPhrase).toBeNull();

		// timeout rows tariffed at full limit
		expect(attempts[2].reactionTimeMs).toBe(120000);
		expect(attempts[2].associationMs).toBe(120000);
	});

	it('does NOT duplicate attempts when the same sessionId is posted twice', async () => {
		const u = await createUser();
		const customId = 'syllable-formation-sess-id-1';

		const s1 = await postResult(sampleResults, 'syllableFormation', u.id, customId);
		expect(s1).toBe(customId);

		const rows1 = await db
			.select()
			.from(syllableFormationAttempt)
			.where(eq(syllableFormationAttempt.sessionId, customId));
		expect(rows1.length).toBe(5);

		// second call with same id
		const s2 = await postResult(sampleResults, 'syllableFormation', u.id, customId);
		expect(s2).toBe(customId);

		// no duplication: still 5 attempts, not 10
		const rows2 = await db
			.select()
			.from(syllableFormationAttempt)
			.where(eq(syllableFormationAttempt.sessionId, customId));
		expect(rows2.length).toBe(5);

		// session is not duplicated either
		const sessions = await db.select().from(session).where(eq(session.id, customId));
		expect(sessions.length).toBe(1);
	});
});
