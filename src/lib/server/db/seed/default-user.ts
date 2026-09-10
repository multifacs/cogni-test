import { eq, and } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';
import { postResult } from '../controllers/result';
import {
	genStroop,
	genMath,
	genMemory,
	genCampimetry,
	genSwallow,
	genMunsterberg
} from './generators';
import { env } from '$env/dynamic/private';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '$lib/server/db/schema';

/**
 * new Date('2000-01-01') is UTC midnight; the value is used only for identity matching, not display.
 * Note: schema has CHECK constraint length(lastname) = 2 — 'NM' passes.
 */
export const DEFAULT_USER = {
	firstname: 'USR',
	lastname: 'NM',
	birthday: new Date('2000-01-01'),
	sex: 'male' as const
};

export function shouldSeedDefaultUser({
	mode,
	nodeEnv
}: {
	mode: string | undefined;
	nodeEnv: string | undefined;
}): boolean {
	return mode === 'DEV' && nodeEnv !== 'test';
}

type SeedResult = { seeded: true; userId: string } | { seeded: false; skipped?: 'gate' };

export async function ensureDefaultUserSeeded(
	db: LibSQLDatabase<typeof schema>
): Promise<SeedResult> {
	const existing = await db
		.select()
		.from(user)
		.where(
			and(
				eq(user.firstname, DEFAULT_USER.firstname),
				eq(user.lastname, DEFAULT_USER.lastname),
				eq(user.birthday, DEFAULT_USER.birthday)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		return { seeded: false };
	}

	const [created] = await db.insert(user).values(DEFAULT_USER).returning();

	try {
		await postResult(genStroop(25), 'stroop', created.id);
		await postResult(genMath(10), 'math', created.id);
		await postResult(genMemory(10), 'memory', created.id);
		await postResult(genCampimetry(20), 'campimetry', created.id);
		await postResult(genSwallow(100), 'swallow', created.id);
		const { results: munResults } = genMunsterberg(8);
		await postResult(munResults, 'munsterberg', created.id);
	} catch (err) {
		try {
			await db.delete(user).where(eq(user.id, created.id));
		} catch (cleanupErr) {
			console.error(
				`[seed] Rollback of user ${created.id} failed, manual cleanup required:`,
				cleanupErr
			);
		}
		throw err;
	}

	return { seeded: true, userId: created.id };
}

let startupSeedPromise: Promise<SeedResult> | null = null;

export async function seedDefaultUserOnStartup(): Promise<SeedResult> {
	if (startupSeedPromise) {
		return startupSeedPromise;
	}

	startupSeedPromise = (async (): Promise<SeedResult> => {
		if (!shouldSeedDefaultUser({ mode: env.MODE, nodeEnv: process.env.NODE_ENV })) {
			console.log('[seed] Skipped: MODE is not "DEV" or NODE_ENV is "test"');
			return { seeded: false, skipped: 'gate' };
		}

		const { db } = await import('$lib/server/db');
		const result = await ensureDefaultUserSeeded(db);

		if (result.seeded) {
			console.log('[seed] Default user USR created');
		} else {
			console.log('[seed] Default user already present');
		}

		return result;
	})();

	try {
		return await startupSeedPromise;
	} catch (err) {
		console.error('[seed] Default user seed failed:', err);
		return { seeded: false };
	} finally {
		startupSeedPromise = null;
	}
}
