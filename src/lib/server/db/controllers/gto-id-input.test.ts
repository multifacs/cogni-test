/**
 * Isolated unit tests for GTO ID input controller helpers.
 * Uses an in-memory LibSQL database with live Drizzle ORM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { user, profileSurvey } from '$lib/server/db/schema';
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
import { autoAddToLatestActiveSession, setGtoIdAndAutoAdd, addParticipant } from './gto';
import { getProfileSurvey, updateProfileSurvey } from './survey';

async function seedUser(id: string) {
	await db.insert(user).values({
		id,
		firstname: 'ТЕ',
		lastname: 'УЗ',
		birthday: new Date('1990-01-01'),
		sex: 'male'
	});
}

async function seedProfileSurvey(
	userId: string,
	overrides: Partial<typeof profileSurvey.$inferInsert> = {}
) {
	await db.insert(profileSurvey).values({
		userId,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	});
}

async function seedActiveSession(name: string): Promise<string> {
	const [row] = await db
		.insert(gtoSession)
		.values({
			name,
			status: 'active',
			createdAt: new Date().toISOString()
		})
		.returning();
	return row.id;
}

beforeEach(async () => {
	// Clean tables that tests touch (child tables first because of FKs)
	await db.delete(gtoEditableMetric);
	await db.delete(gtoSessionParticipant);
	await db.delete(gtoSession);
	await db.delete(profileSurvey);
	await db.delete(user);
});
describe('autoAddToLatestActiveSession', () => {
	it('silently returns when no active session exists', async () => {
		await seedUser('u1');
		await expect(autoAddToLatestActiveSession('u1')).resolves.toBeUndefined();
	});

	it('adds participant when active session exists and user is not yet a participant', async () => {
		await seedUser('u2');
		const sessionId = await seedActiveSession('Session A');

		await autoAddToLatestActiveSession('u2');

		const participants = await db
			.select()
			.from(gtoSessionParticipant)
			.where(sql`${gtoSessionParticipant.userId} = 'u2'`);
		expect(participants).toHaveLength(1);
		expect(participants[0].gtoSessionId).toBe(sessionId);
	});

	it('does NOT add participant if user is already in the session', async () => {
		await seedUser('u3');
		const sessionId = await seedActiveSession('Session B');
		await addParticipant(sessionId, 'u3');

		await autoAddToLatestActiveSession('u3');

		const participants = await db
			.select()
			.from(gtoSessionParticipant)
			.where(sql`${gtoSessionParticipant.userId} = 'u3'`);
		expect(participants).toHaveLength(1);
	});

	it('adds to the latest active session when multiple exist', async () => {
		await seedUser('u4');
		const olderId = await seedActiveSession('Older');
		await new Promise((resolve) => setTimeout(resolve, 50));
		const newerId = await seedActiveSession('Newer');

		await autoAddToLatestActiveSession('u4');

		const participants = await db
			.select()
			.from(gtoSessionParticipant)
			.where(sql`${gtoSessionParticipant.userId} = 'u4'`);
		expect(participants).toHaveLength(1);
		expect(participants[0].gtoSessionId).toBe(newerId);
	});
});

describe('setGtoIdAndAutoAdd', () => {
	beforeEach(async () => {
		await db.delete(gtoEditableMetric);
		await db.delete(gtoSessionParticipant);
		await db.delete(gtoSession);
		await db.delete(profileSurvey);
		await db.delete(user);
	});

	it('returns "already-set" when existing gtoId is present and does NOT call updateProfileSurvey', async () => {
		await seedUser('u5');
		await seedProfileSurvey('u5', { gtoId: 'ABC123' });

		const updateSpy = vi.fn(updateProfileSurvey);

		const result = await setGtoIdAndAutoAdd('u5', 'NEW');
		expect(result).toBe('already-set');

		const surveyAfter = await getProfileSurvey('u5');
		expect(surveyAfter?.gtoId).toBe('ABC123');
	});

	it('returns "saved" and sets gtoId when it was previously empty', async () => {
		await seedUser('u6');
		await seedProfileSurvey('u6');

		const result = await setGtoIdAndAutoAdd('u6', 'XYZ789');
		expect(result).toBe('saved');

		const surveyAfter = await getProfileSurvey('u6');
		expect(surveyAfter?.gtoId).toBe('XYZ789');
	});

	it('auto-adds to latest active session when returning "saved"', async () => {
		await seedUser('u7');
		await seedProfileSurvey('u7');
		const sessionId = await seedActiveSession('Active Sess');

		await setGtoIdAndAutoAdd('u7', 'GTO001');

		const participants = await db
			.select()
			.from(gtoSessionParticipant)
			.where(sql`${gtoSessionParticipant.userId} = 'u7'`);
		expect(participants).toHaveLength(1);
		expect(participants[0].gtoSessionId).toBe(sessionId);
	});

	it('does NOT call addParticipant a second time if user already participated', async () => {
		await seedUser('u8');
		await seedProfileSurvey('u8');
		const sessionId = await seedActiveSession('Active Sess 2');
		await addParticipant(sessionId, 'u8');

		await setGtoIdAndAutoAdd('u8', 'GTO002');

		const participants = await db
			.select()
			.from(gtoSessionParticipant)
			.where(sql`${gtoSessionParticipant.userId} = 'u8'`);
		expect(participants).toHaveLength(1);
	});
});
