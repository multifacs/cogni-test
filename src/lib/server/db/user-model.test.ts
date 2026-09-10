/**
 * Isolated unit test for the user model.
 * This file uses `vi.mock('$lib/server/db')` with an in-memory LibSQL client
 * (`:memory:`) + Drizzle migrations. It does NOT write to the real database.
 * For seeding the dev database, use `npm run test:seed` (separate script).
 */
import { describe, it, expect, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { user } from './schema';

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

import { db } from '$lib/server/db';

const FIRST_NAMES = [
	'АЛЕКСАНДР',
	'ДМИТРИЙ',
	'МАКСИМ',
	'СЕРГЕЙ',
	'АНДРЕЙ',
	'АЛЕКСЕЙ',
	'АРТЁМ',
	'ИЛЬЯ',
	'КИРИЛЛ',
	'МИХАИЛ',
	'НИКИТА',
	'МАТВЕЙ',
	'РОМАН',
	'ЕГОР',
	'АРСЕНИЙ',
	'ИВАН',
	'ДЕНИС',
	'ЕВГЕНИЙ',
	'ДАНИИЛ',
	'ТИМОФЕЙ',
	'АННА',
	'МАРИЯ',
	'ЕЛЕНА',
	'ОЛЬГА',
	'НАТАЛЬЯ',
	'ИРИНА',
	'ЕКАТЕРИНА',
	'СВЕТЛАНА',
	'ДАРЬЯ',
	'АЛИНА',
	'ВИКТОРИЯ',
	'ПОЛИНА',
	'КСЕНИЯ',
	'ВАРВАРА',
	'СОФЬЯ',
	'АЛЕКСАНДРА',
	'МАРИНА',
	'ЛЮДМИЛА',
	'ВАЛЕНТИНА',
	'ТАТЬЯНА'
];

const LAST_NAMES = ['АА', 'АБ', 'АВ', 'БА', 'ББ', 'БВ', 'ВА', 'ВБ', 'ВВ', 'ГА'];

function randomFrom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(minAge: number, maxAge: number): Date {
	const now = new Date();
	const minYear = now.getFullYear() - maxAge;
	const maxYear = now.getFullYear() - minAge;
	const year = minYear + Math.floor(Math.random() * (maxYear - minYear + 1));
	const month = Math.floor(Math.random() * 12);
	const day = Math.floor(Math.random() * 28) + 1;
	return new Date(year, month, day);
}

function generateRandomUser() {
	const sex = Math.random() < 0.5 ? ('male' as const) : ('female' as const);
	const firstname = randomFrom(FIRST_NAMES);
	const lastname = randomFrom(LAST_NAMES);
	const birthday = randomDate(18, 75);

	return { firstname, lastname, birthday, sex };
}

describe('user model', () => {
	it('inserting N random users increases count by N', async () => {
		const count = 10;

		const before = await db.select({ count: sql<number>`count(*)` }).from(user);
		const beforeCount = Number(before[0].count);

		const users = Array.from({ length: count }, () => generateRandomUser());
		const inserted = await db.insert(user).values(users).returning();

		expect(inserted).toHaveLength(count);

		const after = await db.select({ count: sql<number>`count(*)` }).from(user);
		const afterCount = Number(after[0].count);

		expect(afterCount).toBe(beforeCount + count);
	});

	it('rejects a user with a 3-letter lastname', async () => {
		try {
			await db.insert(user).values({
				firstname: 'ИВАН',
				lastname: 'АБВ',
				birthday: new Date(2000, 0, 1),
				sex: 'male'
			});
			expect.unreachable('should have thrown');
		} catch (e) {
			const message = e instanceof Error ? (e.cause?.message ?? e.message) : String(e);
			expect(message).toContain('lastname_length');
		}
	});
});
