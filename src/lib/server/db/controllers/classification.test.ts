/**
 * Unit tests for the classification controller.
 * Uses an in-memory LibSQL database with live Drizzle ORM (pattern of ai-survey/gto tests).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { user, session } from '$lib/server/db/schema';
import {
	classificationWordGroup,
	classificationRetelling
} from '$lib/server/db/models/ai';

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
import { saveClassificationResult } from './classification';

async function seedUser(id: string) {
	await db.insert(user).values({
		id,
		firstname: 'ТЕ',
		lastname: 'УЗ',
		birthday: new Date('1990-01-01'),
		sex: 'male'
	});
}

function makePayload(
	groups: Array<{ words: string[]; feature?: string }>,
	retelling = ''
) {
	return {
		groups: groups.map((g) => ({ words: g.words, feature: g.feature ?? '' })),
		retelling
	};
}

beforeEach(async () => {
	await db.delete(classificationRetelling);
	await db.delete(classificationWordGroup);
	await db.delete(session);
	await db.delete(user);
	await seedUser('u1');
});

describe('saveClassificationResult', () => {
	it('creates a session with testType classification and saves groups + retelling', async () => {
		const sessionId = await saveClassificationResult('u1', makePayload(
			[
				{ words: ['овец', 'стадо'], feature: 'животные' },
				{ words: ['шкатулка', 'бусинка'], feature: 'предметы' }
			],
			'пастух наблюдал за овцами'
		));

		const sess = await db.query.session.findFirst({
			where: (f, { eq }) => eq(f.id, sessionId)
		});
		expect(sess?.testType).toBe('classification');
		expect(sess?.userId).toBe('u1');

		const groups = await db
			.select()
			.from(classificationWordGroup)
			.orderBy(classificationWordGroup.groupIndex);
		expect(groups).toHaveLength(2);
		expect(groups[0].sessionId).toBe(sessionId);
		expect(groups[0].groupIndex).toBe(0);
		expect(JSON.parse(groups[0].words)).toEqual(['овец', 'стадо']);
		expect(groups[0].feature).toBe('животные');
		expect(groups[1].groupIndex).toBe(1);
		expect(JSON.parse(groups[1].words)).toEqual(['шкатулка', 'бусинка']);

		const retellings = await db.select().from(classificationRetelling);
		expect(retellings).toHaveLength(1);
		expect(retellings[0].sessionId).toBe(sessionId);
		expect(retellings[0].text).toBe('пастух наблюдал за овцами');
	});

	it('discards empty groups and does not leave gaps in groupIndex', async () => {
		const sessionId = await saveClassificationResult('u1', makePayload(
			[
				{ words: [], feature: 'пустая' },
				{ words: ['овец'], feature: '' },
				{ words: ['шкатулка'], feature: 'x' }
			],
			''
		));

		const groups = await db
			.select()
			.from(classificationWordGroup)
			.orderBy(classificationWordGroup.groupIndex);
		expect(groups).toHaveLength(2);
		expect(groups.map((g) => g.groupIndex)).toEqual([0, 1]);
		expect(groups[0].words).toContain('овец');
		// feature опциональна при непустых словах
		expect(groups[0].feature).toBe('');
	});

	it('omits the retelling row entirely when the retelling is an empty string', async () => {
		await saveClassificationResult('u1', makePayload([{ words: ['овец'] }], ''));
		expect(await db.select().from(classificationRetelling)).toHaveLength(0);
	});

	it('a repeated submit creates a NEW session (no upsert)', async () => {
		const first = await saveClassificationResult('u1', makePayload(
			[{ words: ['овец'] }],
			'первый'
		));
		const second = await saveClassificationResult('u1', makePayload(
			[{ words: ['шкатулка'] }],
			'второй'
		));

		expect(second).not.toBe(first);
		const sessions = await db.select().from(session);
		expect(sessions).toHaveLength(2);
		const retellings = await db.select().from(classificationRetelling);
		expect(retellings).toHaveLength(2);
		expect(retellings.map((r) => r.text).sort()).toEqual(['второй', 'первый']);
	});

	it('throws loudly when there are more than 50 non-empty groups', async () => {
		const groups = Array.from({ length: 51 }, (_, i) => ({
			words: [`w${i}`],
			feature: 'f'
		}));
		await expect(
			saveClassificationResult('u1', makePayload(groups))
		).rejects.toThrow(/50/i);
		expect(await db.select().from(session)).toHaveLength(0);
	});

	it('accepts exactly 50 non-empty groups', async () => {
		const groups = Array.from({ length: 50 }, (_, i) => ({
			words: [`w${i}`],
			feature: 'f'
		}));
		const sessionId = await saveClassificationResult('u1', makePayload(groups));
		const saved = await db.select().from(classificationWordGroup);
		expect(saved).toHaveLength(50);
		expect(saved.every((g) => g.sessionId === sessionId)).toBe(true);
	});

	it('throws when a feature exceeds 1000 characters', async () => {
		await expect(
			saveClassificationResult('u1', makePayload([{ words: ['овец'], feature: 'ф'.repeat(1001) }]))
		).rejects.toThrow(/1000/);
	});

	it('throws when a retelling exceeds 1000 characters', async () => {
		await expect(
			saveClassificationResult('u1', makePayload([{ words: ['овец'] }], 'ф'.repeat(1001)))
		).rejects.toThrow(/1000/);
	});

	it('throws when any single word exceeds 1000 characters (working limit)', async () => {
		await expect(
			saveClassificationResult('u1', makePayload([{ words: ['ф'.repeat(1001)] }]))
		).rejects.toThrow(/1000/);
	});

	it('does not persist anything when validation fails', async () => {
		await expect(
			saveClassificationResult('u1', makePayload([
				{ words: ['овец'] },
				{ words: ['ф'.repeat(1001)] }
			]))
		).rejects.toThrow();
		expect(await db.select().from(session)).toHaveLength(0);
		expect(await db.select().from(classificationWordGroup)).toHaveLength(0);
	});
});
