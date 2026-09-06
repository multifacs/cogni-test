/**
 * Database seed test: inserts random users into the REAL database pointed to by DATABASE_URL.
 * Run via `npm run test:seed`. Normal `npm test` silently skips it.
 */
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { user } from './schema';

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

describe.skipIf(!process.env.SEED_DB)('seed users', () => {
	it('inserts N random users and count increases by N', async () => {
		const { db } = await import('$lib/server/db');
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
});
