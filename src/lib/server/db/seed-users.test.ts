import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { user } from './schema';
import { sql } from 'drizzle-orm';

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

export function generateRandomUser() {
	const sex = Math.random() < 0.5 ? ('male' as const) : ('female' as const);
	const firstname = randomFrom(FIRST_NAMES);
	const lastname = randomFrom(LAST_NAMES);
	const birthday = randomDate(18, 75);

	return { firstname, lastname, birthday, sex };
}

function getDb() {
	const url = process.env.DATABASE_URL;
	if (!url) return null;
	const client = createClient({ url });
	return drizzle(client, { schema });
}

describe.skipIf(!process.env.DATABASE_URL)('seed users', () => {
	it('populates the database with random users', async () => {
		const count = parseInt(process.env.SEED_COUNT || '50', 10);
		const db = getDb()!;

		const before = await db.select({ count: sql<number>`count(*)` }).from(user);
		const beforeCount = Number(before[0].count);

		const users = Array.from({ length: count }, () => generateRandomUser());
		const inserted = await db.insert(user).values(users).returning();

		expect(inserted).toHaveLength(count);

		const after = await db.select({ count: sql<number>`count(*)` }).from(user);
		const afterCount = Number(after[0].count);

		expect(afterCount).toBe(beforeCount + count);

		console.log(`✓ Seeded ${count} users (total: ${afterCount})`);
	});

	it('rejects a user with a 3-letter lastname', async () => {
		const db = getDb()!;

		const result = db.insert(user).values({
			firstname: 'ИВАН',
			lastname: 'АБВ',
			birthday: new Date(2000, 0, 1),
			sex: 'male'
		});

		try {
			await result;
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.cause?.message ?? e.message).toContain('lastname_length');
		}
	});
});
