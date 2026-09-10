import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('$env/dynamic/private', () => ({
	env: { MODE: 'DEV' }
}));

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

vi.mock('../controllers/result', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../controllers/result')>();
	return {
		...actual,
		postResult: vi.fn(actual.postResult)
	};
});

import { db } from '$lib/server/db';
import { user, session } from '$lib/server/db/schema';
import {
	campimetryAttempt,
	mathAttempt,
	memoryAttempt,
	munsterbergAttempt,
	stroopAttempt,
	swallowAttempt
} from '$lib/server/db/models/tests';
import { postResult } from '../controllers/result';
import {
	DEFAULT_USER,
	shouldSeedDefaultUser,
	ensureDefaultUserSeeded,
	seedDefaultUserOnStartup
} from './default-user';

beforeEach(async () => {
	await db.delete(stroopAttempt);
	await db.delete(mathAttempt);
	await db.delete(memoryAttempt);
	await db.delete(campimetryAttempt);
	await db.delete(swallowAttempt);
	await db.delete(munsterbergAttempt);
	await db.delete(session);
	await db.delete(user);
	vi.mocked(postResult).mockRestore();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('shouldSeedDefaultUser gate', () => {
	it.each([
		[{ mode: 'DEV', nodeEnv: 'development' }, true],
		[{ mode: 'DEV', nodeEnv: 'test' }, false],
		[{ mode: 'DEV', nodeEnv: undefined }, true],
		[{ mode: undefined, nodeEnv: 'development' }, false],
		[{ mode: 'PROD', nodeEnv: 'development' }, false],
		[{ mode: 'prod', nodeEnv: 'development' }, false],
		[{ mode: 'DEV ', nodeEnv: 'development' }, false],
		[{ mode: 'dev', nodeEnv: 'development' }, false],
		[{ mode: 'D', nodeEnv: 'development' }, false]
	])('shouldSeedDefaultUser(%o) === %s', (input, expected) => {
		expect(
			shouldSeedDefaultUser(
				input as { mode: string | undefined; nodeEnv: string | undefined }
			)
		).toBe(expected);
	});
});

describe('ensureDefaultUserSeeded', () => {
	it('seeds a fresh DB and returns { seeded: true }', async () => {
		const result = await ensureDefaultUserSeeded(db);
		expect(result.seeded).toBe(true);
		expect('userId' in result && result.userId).toBeTruthy();

		const userId = (result as { seeded: true; userId: string }).userId;
		const [found] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

		expect(found).toBeDefined();
		expect(found.firstname).toBe('USR');
		expect(found.lastname).toBe('NM');
		expect(found.sex).toBe('male');
		expect(found.birthday.getTime()).toBe(DEFAULT_USER.birthday.getTime());
		expect(found.lastActiveAt).toBeNull();
	});

	it('creates exactly 6 sessions with correct attempt counts', async () => {
		const { userId } = (await ensureDefaultUserSeeded(db)) as {
			seeded: true;
			userId: string;
		};

		const sessions = await db.select().from(session).where(eq(session.userId, userId));
		expect(sessions).toHaveLength(6);

		const sessionIds: Record<string, string> = {};
		for (const s of sessions) {
			sessionIds[s.testType] = s.id;
		}

		expect(Object.keys(sessionIds).sort()).toEqual([
			'campimetry',
			'math',
			'memory',
			'munsterberg',
			'stroop',
			'swallow'
		]);

		const stroopRows = await db
			.select()
			.from(stroopAttempt)
			.where(eq(stroopAttempt.sessionId, sessionIds.stroop));
		const mathRows = await db
			.select()
			.from(mathAttempt)
			.where(eq(mathAttempt.sessionId, sessionIds.math));
		const memoryRows = await db
			.select()
			.from(memoryAttempt)
			.where(eq(memoryAttempt.sessionId, sessionIds.memory));
		const campimetryRows = await db
			.select()
			.from(campimetryAttempt)
			.where(eq(campimetryAttempt.sessionId, sessionIds.campimetry));
		const swallowRows = await db
			.select()
			.from(swallowAttempt)
			.where(eq(swallowAttempt.sessionId, sessionIds.swallow));
		const munsterbergRows = await db
			.select()
			.from(munsterbergAttempt)
			.where(eq(munsterbergAttempt.sessionId, sessionIds.munsterberg));

		expect(stroopRows).toHaveLength(25);
		expect(mathRows).toHaveLength(10);
		expect(memoryRows).toHaveLength(10);
		expect(campimetryRows).toHaveLength(20);
		expect(swallowRows).toHaveLength(100);
		expect(munsterbergRows).toHaveLength(8);
	});

	it('returns { seeded: false } on second call without creating extra sessions', async () => {
		const first = await ensureDefaultUserSeeded(db);
		expect(first.seeded).toBe(true);

		const firstUserId = (first as { seeded: true; userId: string }).userId;
		const sessionsBefore = await db
			.select()
			.from(session)
			.where(eq(session.userId, firstUserId));
		expect(sessionsBefore).toHaveLength(6);

		const second = await ensureDefaultUserSeeded(db);
		expect(second.seeded).toBe(false);

		const sessionsAfter = await db
			.select()
			.from(session)
			.where(eq(session.userId, firstUserId));
		expect(sessionsAfter).toHaveLength(6);
	});
});

describe('seedDefaultUserOnStartup concurrency dedup', () => {
	it('deduplicates concurrent calls to a single seed run', async () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		try {
			const [r1, r2] = await Promise.all([
				seedDefaultUserOnStartup(),
				seedDefaultUserOnStartup()
			]);

			expect(r1.seeded && r2.seeded).toBe(true);

			const users = await db.select().from(user);
			expect(users).toHaveLength(1);

			const sessionsRows = await db
				.select()
				.from(session)
				.where(eq(session.userId, users[0].id));
			expect(sessionsRows).toHaveLength(6);
		} finally {
			process.env.NODE_ENV = originalNodeEnv;
		}
	});
});

describe('seedDefaultUserOnStartup fail-soft', () => {
	it('resolves with { seeded: false } when postResult rejects', async () => {
		vi.mocked(postResult).mockRejectedValueOnce(new Error('boom'));
		vi.stubEnv('NODE_ENV', 'development');

		const result = await seedDefaultUserOnStartup();
		expect(result).toEqual({ seeded: false });
	});
});

describe('ensureDefaultUserSeeded cleanup', () => {
	it('throws and deletes the user row when postResult rejects', async () => {
		vi.mocked(postResult).mockRejectedValueOnce(new Error('boom'));

		await expect(ensureDefaultUserSeeded(db)).rejects.toThrow('boom');

		const rows = await db.select().from(user).where(eq(user.firstname, 'USR'));
		expect(rows).toHaveLength(0);
		expect(vi.mocked(postResult).mock.calls).toHaveLength(1);
	});

	it('throws the original error even when rollback delete also fails', async () => {
		const deleteSpy = vi.spyOn(db, 'delete').mockImplementationOnce(() => {
			throw new Error('rollback-delete-failed');
		});
		vi.mocked(postResult).mockRejectedValueOnce(new Error('boom'));

		await expect(ensureDefaultUserSeeded(db)).rejects.toThrow('boom');

		deleteSpy.mockRestore();
	});
});
