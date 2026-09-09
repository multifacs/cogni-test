/**
 * Database seed test: inserts random test results for the most recently active user into the REAL database pointed to by DATABASE_URL.
 * Run via `npm run test:seed`. Normal `npm test` silently skips it.
 */
import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { user } from './schema';
import {
	campimetryAttempt,
	mathAttempt,
	memoryAttempt,
	munsterbergAttempt,
	stroopAttempt,
	swallowAttempt
} from './models/tests';

import {
	genStroop,
	genMath,
	genMemory,
	genCampimetry,
	genSwallow,
	genMunsterberg
} from './seed/generators';

describe.skipIf(!process.env.SEED_DB)('seed results', () => {
	it('populates last active user with random results for all 6 test types', async () => {
		const { db } = await import('$lib/server/db');
		const { postResult } = await import('./controllers/result');
		let [targetUser] = await db
			.select()
			.from(user)
			.orderBy(sql`${user.lastActiveAt} DESC`)
			.limit(1);

		if (!targetUser) {
			await db.insert(user).values({
				firstname: 'Te',
				lastname: 'St',
				birthday: new Date(),
				sex: 'male'
			});
			[targetUser] = await db
				.select()
				.from(user)
				.orderBy(sql`${user.lastActiveAt} DESC`)
				.limit(1);
		}

		if (!targetUser) {
			throw new Error('Failed to find or create a target user for seeding results');
		}

		const stroopSessionId = await postResult(genStroop(25), 'stroop', targetUser.id);
		const mathSessionId = await postResult(genMath(10), 'math', targetUser.id);
		const memorySessionId = await postResult(genMemory(10), 'memory', targetUser.id);
		const campimetrySessionId = await postResult(
			genCampimetry(20),
			'campimetry',
			targetUser.id
		);
		const swallowSessionId = await postResult(genSwallow(100), 'swallow', targetUser.id);
		const { results: munResults } = genMunsterberg(8);
		const munsterbergSessionId = await postResult(munResults, 'munsterberg', targetUser.id);

		const stroopRows = await db
			.select()
			.from(stroopAttempt)
			.where(eq(stroopAttempt.sessionId, stroopSessionId));
		const mathRows = await db
			.select()
			.from(mathAttempt)
			.where(eq(mathAttempt.sessionId, mathSessionId));
		const memoryRows = await db
			.select()
			.from(memoryAttempt)
			.where(eq(memoryAttempt.sessionId, memorySessionId));
		const campimetryRows = await db
			.select()
			.from(campimetryAttempt)
			.where(eq(campimetryAttempt.sessionId, campimetrySessionId));
		const swallowRows = await db
			.select()
			.from(swallowAttempt)
			.where(eq(swallowAttempt.sessionId, swallowSessionId));
		const munsterbergRows = await db
			.select()
			.from(munsterbergAttempt)
			.where(eq(munsterbergAttempt.sessionId, munsterbergSessionId));

		expect(stroopRows.length).toBe(25);
		expect(mathRows.length).toBe(10);
		expect(memoryRows.length).toBe(10);
		expect(campimetryRows.length).toBe(20);
		expect(swallowRows.length).toBe(100);
		expect(munsterbergRows.length).toBe(8);
	});
});
