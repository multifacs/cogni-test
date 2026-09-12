/**
 * Isolated unit tests for the deleteGtoSession controller.
 * Uses an in-memory LibSQL database with live Drizzle ORM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { user, session } from '$lib/server/db/schema';
import { gtoSession, gtoSessionParticipant, gtoEditableMetric } from '$lib/server/db/models/gto';

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
import { deleteGtoSession } from './gto';

async function seedUser(id: string) {
	await db.insert(user).values({
		id,
		firstname: 'ТЕ',
		lastname: 'УЗ',
		birthday: new Date('1990-01-01'),
		sex: 'male'
	});
}

async function seedGtoSession(id: string, status: string) {
	await db.insert(gtoSession).values({
		id,
		name: `Session ${id}`,
		status,
		createdAt: new Date().toISOString()
	});
}

async function seedParticipant(id: string, gtoSessionId: string, userId: string) {
	await db.insert(gtoSessionParticipant).values({
		id,
		gtoSessionId,
		userId,
		hasCompletedTests: true,
		hasSubmittedWords: true
	});
	await db.insert(gtoEditableMetric).values({
		id: `metric-${id}`,
		participantId: id,
		logic: 1
	});
}

async function seedTestSession(userId: string, gtoSessionId: string | null) {
	await db.insert(session).values({
		userId,
		gtoSessionId,
		testType: 'stroop',
		createdAt: '2026-09-09 10:00:00'
	});
}

beforeEach(async () => {
	await db.delete(session);
	await db.delete(gtoEditableMetric);
	await db.delete(gtoSessionParticipant);
	await db.delete(gtoSession);
	await db.delete(user);
});

describe('deleteGtoSession', () => {
	it('deletes a completed session with participants, metrics and unlinks test sessions', async () => {
		await seedUser('u1');
		await seedUser('u2');
		await seedGtoSession('gs1', 'completed');
		await seedParticipant('p1', 'gs1', 'u1');
		await seedParticipant('p2', 'gs1', 'u2');
		await seedTestSession('u1', 'gs1');
		await seedTestSession('u2', 'gs1');

		await expect(deleteGtoSession('gs1')).resolves.toBeUndefined();

		// GTO session row gone
		const sessions = await db.select().from(gtoSession).where(eq(gtoSession.id, 'gs1'));
		expect(sessions).toHaveLength(0);

		// Participant rows gone
		const participants = await db
			.select()
			.from(gtoSessionParticipant)
			.where(eq(gtoSessionParticipant.gtoSessionId, 'gs1'));
		expect(participants).toHaveLength(0);

		// Editable metric rows gone
		const metrics = await db
			.select()
			.from(gtoEditableMetric)
			.where(inArray(gtoEditableMetric.participantId, ['p1', 'p2']));
		expect(metrics).toHaveLength(0);

		// Test sessions survive, unlinked
		const testSessions = await db.select().from(session);
		expect(testSessions).toHaveLength(2);
		for (const ts of testSessions) {
			expect(ts.gtoSessionId).toBeNull();
		}
	});

	it('refuses to delete an active session and deletes nothing', async () => {
		await seedUser('u1');
		await seedGtoSession('gs1', 'active');
		await seedParticipant('p1', 'gs1', 'u1');
		await seedTestSession('u1', 'gs1');

		await expect(deleteGtoSession('gs1')).rejects.toMatchObject({
			code: 'not_completed'
		});

		const sessions = await db.select().from(gtoSession);
		expect(sessions).toHaveLength(1);
		const participants = await db.select().from(gtoSessionParticipant);
		expect(participants).toHaveLength(1);
		const metrics = await db.select().from(gtoEditableMetric);
		expect(metrics).toHaveLength(1);
		const testSessions = await db.select().from(session);
		expect(testSessions).toHaveLength(1);
		expect(testSessions[0].gtoSessionId).toBe('gs1');
	});

	it('refuses to delete a paused session and deletes nothing', async () => {
		await seedUser('u1');
		await seedGtoSession('gs1', 'paused');
		await seedParticipant('p1', 'gs1', 'u1');
		await seedTestSession('u1', 'gs1');

		await expect(deleteGtoSession('gs1')).rejects.toMatchObject({
			code: 'not_completed'
		});

		const sessions = await db.select().from(gtoSession);
		expect(sessions).toHaveLength(1);
		const participants = await db.select().from(gtoSessionParticipant);
		expect(participants).toHaveLength(1);
		const metrics = await db.select().from(gtoEditableMetric);
		expect(metrics).toHaveLength(1);
		const testSessions = await db.select().from(session);
		expect(testSessions).toHaveLength(1);
		expect(testSessions[0].gtoSessionId).toBe('gs1');
	});

	it('throws not_found for a non-existent id', async () => {
		await expect(deleteGtoSession('missing')).rejects.toMatchObject({
			code: 'not_found'
		});
	});
});
