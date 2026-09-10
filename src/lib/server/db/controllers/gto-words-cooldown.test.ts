/**
 * Isolated unit tests for the GTO words-cooldown controller helper.
 * Uses an in-memory LibSQL database with live Drizzle ORM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { user, session } from '$lib/server/db/schema';
import { gtoSession } from '$lib/server/db/models/gto';

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
import { getParticipantLastResultAt } from './gto';

async function seedUser(id: string) {
	await db.insert(user).values({
		id,
		firstname: 'ТЕ',
		lastname: 'УЗ',
		birthday: new Date('1990-01-01'),
		sex: 'male'
	});
}

async function seedGtoSession(id: string) {
	await db.insert(gtoSession).values({
		id,
		name: `Session ${id}`,
		status: 'active',
		createdAt: new Date().toISOString()
	});
}

async function seedTestSession(userId: string, gtoSessionId: string | null, createdAt: string) {
	await db.insert(session).values({
		userId,
		gtoSessionId,
		testType: 'stroop',
		// Explicit CURRENT_TIMESTAMP-format value, as SQLite stores in production
		createdAt
	});
}

beforeEach(async () => {
	await db.delete(session);
	await db.delete(gtoSession);
	await db.delete(user);
});

describe('getParticipantLastResultAt', () => {
	it('returns null when the participant has no results', async () => {
		await seedUser('u1');
		await seedGtoSession('gs1');

		await expect(getParticipantLastResultAt('gs1', 'u1')).resolves.toBeNull();
	});

	it('returns the single row createdAt exactly as stored', async () => {
		await seedUser('u2');
		await seedGtoSession('gs1');
		await seedTestSession('u2', 'gs1', '2026-09-09 10:00:00');

		await expect(getParticipantLastResultAt('gs1', 'u2')).resolves.toBe('2026-09-09 10:00:00');
	});

	it('returns the max (latest) createdAt of several rows', async () => {
		await seedUser('u3');
		await seedGtoSession('gs1');
		await seedTestSession('u3', 'gs1', '2026-09-09 10:00:00');
		await seedTestSession('u3', 'gs1', '2026-09-09 10:05:30');
		await seedTestSession('u3', 'gs1', '2026-09-09 10:02:15');

		await expect(getParticipantLastResultAt('gs1', 'u3')).resolves.toBe('2026-09-09 10:05:30');
	});

	it('ignores rows from other GTO sessions and other users', async () => {
		await seedUser('u4');
		await seedUser('u5');
		await seedGtoSession('gs1');
		await seedGtoSession('gs2');
		await seedTestSession('u4', 'gs1', '2026-09-09 10:00:00');
		await seedTestSession('u4', 'gs2', '2026-09-09 11:00:00'); // other GTO session
		await seedTestSession('u5', 'gs1', '2026-09-09 12:00:00'); // other user

		await expect(getParticipantLastResultAt('gs1', 'u4')).resolves.toBe('2026-09-09 10:00:00');
	});

	it('ignores rows with null gtoSessionId', async () => {
		await seedUser('u6');
		await seedGtoSession('gs1');
		await seedTestSession('u6', null, '2026-09-09 13:00:00');
		await seedTestSession('u6', 'gs1', '2026-09-09 10:00:00');

		await expect(getParticipantLastResultAt('gs1', 'u6')).resolves.toBe('2026-09-09 10:00:00');
	});
});
