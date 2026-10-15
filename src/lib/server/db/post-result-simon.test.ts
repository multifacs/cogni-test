/**
 * Integration test for the simon DB layer: postResult/getResults
 * over the full drizzle migration chain on an in-memory LibSQL client.
 * Паттерн — post-result-corsi-block.test.ts (порядок импортов важен:
 * vi.mock поднимается наверх).
 */
import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { user, session } from './schema';
import { simonTaskAttempt } from './models/exercises';
import type { SimonResult } from '$lib/exercises/simon/types';

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

/** Реалистичный мини-фикстур: 6 проб, поля как из evaluateTrial движка. */
const sampleResults: SimonResult[] = [
	{
		block: 1,
		trialIndex: 1,
		color: 'red',
		position: 'center',
		congruency: 'neutral',
		isCorrect: true,
		responseTimeMs: 640,
		timedOut: false
	},
	{
		block: 2,
		trialIndex: 6,
		color: 'blue',
		position: 'right',
		congruency: 'congruent',
		isCorrect: true,
		responseTimeMs: 510,
		timedOut: false
	},
	{
		block: 2,
		trialIndex: 7,
		color: 'red',
		position: 'right',
		congruency: 'incongruent',
		isCorrect: true,
		responseTimeMs: 780,
		timedOut: false
	},
	{
		block: 3,
		trialIndex: 16,
		color: 'green',
		position: 'down',
		congruency: 'incongruent',
		isCorrect: false,
		responseTimeMs: 1500,
		timedOut: false
	},
	{
		block: 3,
		trialIndex: 17,
		color: 'yellow',
		position: 'left',
		congruency: 'incongruent',
		isCorrect: false,
		responseTimeMs: 3000,
		timedOut: true
	},
	{
		block: 3,
		trialIndex: 18,
		color: 'blue',
		position: 'up',
		congruency: 'incongruent',
		isCorrect: true,
		responseTimeMs: 900,
		timedOut: false
	}
];

describe('postResult simonTask', () => {
	async function createUser() {
		const [created] = await db
			.insert(user)
			.values({
				firstname: 'Simon',
				lastname: 'St',
				birthday: new Date(),
				sex: 'male'
			})
			.returning();
		return created;
	}

	it('persists session with meta and all attempt rows, ordered by trialIndex', async () => {
		const u = await createUser();

		const sessionId = await postResult(
			{
				results: buildFullSession(),
				meta: { blocks: '5+10+20', windowMs: '3000' }
			},
			'simonTask',
			u.id
		);
		expect(typeof sessionId).toBe('string');

		const [sess] = await db.select().from(session).where(eq(session.id, sessionId));
		expect(sess).toBeDefined();
		expect(sess.testType).toBe('simonTask');
		expect(sess.meta).toBeTruthy();
		expect(JSON.parse(sess.meta!)).toEqual({ blocks: '5+10+20', windowMs: '3000' });

		const rows = await db
			.select()
			.from(simonTaskAttempt)
			.where(eq(simonTaskAttempt.sessionId, sessionId));
		expect(rows.length).toBe(35);

		// getResults возвращает попытки, отсортированные по asc(trialIndex)
		const results = await getResults('simonTask', u.id);
		expect(results.length).toBeGreaterThan(0);
		const found = results.find((r) => r.sessionId === sessionId);
		expect(found).toBeDefined();
		const attempts = found!.attempts as SimonResult[];
		expect(attempts.length).toBe(35);
		expect(attempts.map((a) => a.trialIndex)).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
	});

	it('stores raw column values the schema expects', async () => {
		const u = await createUser();

		const sessionId = await postResult(sampleResults, 'simonTask', u.id);

		const rows = await db
			.select()
			.from(simonTaskAttempt)
			.where(eq(simonTaskAttempt.sessionId, sessionId));
		expect(rows.length).toBe(6);
		expect(rows.every((r) => r.sessionId === sessionId)).toBe(true);

		const first = rows[0];
		expect(first.block).toBe(1);
		expect(first.trialIndex).toBe(1);
		expect(first.color).toBe('red');
		expect(first.position).toBe('center');
		expect(first.congruency).toBe('neutral');
		expect(first.isCorrect).toBe(true);
		expect(first.responseTimeMs).toBe(640);
		expect(first.timedOut).toBe(false);

		// Инконгруэнтная проба блока 2 с ошибкой
		const wrong = rows.find((r) => r.trialIndex === 16)!;
		expect(wrong.isCorrect).toBe(false);
		expect(wrong.timedOut).toBe(false);
		expect(wrong.responseTimeMs).toBe(1500);

		// Таймаут: окно 3000 мс тарифицируется как полный windowMs
		const timeout = rows.find((r) => r.trialIndex === 17)!;
		expect(timeout.timedOut).toBe(true);
		expect(timeout.isCorrect).toBe(false);
		expect(timeout.responseTimeMs).toBe(3000);
	});

	it('does NOT duplicate attempts when the same sessionId is posted twice', async () => {
		const u = await createUser();
		const customId = 'simon-sess-id-1';

		const s1 = await postResult(sampleResults, 'simonTask', u.id, customId);
		expect(s1).toBe(customId);

		const rows1 = await db
			.select()
			.from(simonTaskAttempt)
			.where(eq(simonTaskAttempt.sessionId, customId));
		expect(rows1.length).toBe(6);

		const s2 = await postResult(sampleResults, 'simonTask', u.id, customId);
		expect(s2).toBe(customId);

		const rows2 = await db
			.select()
			.from(simonTaskAttempt)
			.where(eq(simonTaskAttempt.sessionId, customId));
		expect(rows2.length).toBe(6);

		const sessions = await db.select().from(session).where(eq(session.id, customId));
		expect(sessions.length).toBe(1);
	});
});

/**
 * Полная сессия из 35 проб: детерминированные поля, сквозной trialIndex
 * 1..35, блоки 1 (5) / 2 (10) / 3 (20). Значения полей реалистичные,
 * для скорости — одинаковое чередование цветов/позиций.
 */
function buildFullSession(): SimonResult[] {
	const results: SimonResult[] = [];
	const colors: SimonResult['color'][] = ['red', 'blue', 'green', 'yellow'];
	const positions: SimonResult['position'][] = ['center', 'left', 'right', 'up', 'down'];
	for (let i = 1; i <= 35; i++) {
		const block = i <= 5 ? 1 : i <= 15 ? 2 : 3;
		results.push({
			block: (block as 1 | 2 | 3),
			trialIndex: i,
			color: colors[i % colors.length]!,
			position: positions[i % positions.length]!,
			congruency: block === 1 ? 'neutral' : i % 2 === 0 ? 'congruent' : 'incongruent',
			isCorrect: i % 3 !== 0,
			responseTimeMs: 500 + (i % 5) * 100,
			timedOut: false
		});
	}
	return results;
}
