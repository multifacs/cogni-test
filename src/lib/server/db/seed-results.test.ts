import { describe, it, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { user } from './schema';
import { postResult } from './controllers/result';
import { sql } from 'drizzle-orm';
import type { StroopResult, Color } from '$lib/tests/stroop/types';
import type { MathResult, Sign } from '$lib/tests/math/types';
import type { MemoryResult } from '$lib/tests/memory/types';
import type { CampimetryResult } from '$lib/tests/campimetry/types';
import type { SwallowResult, Direction, Background } from '$lib/tests/swallow/types';
import type { MunsterbergResult } from '$lib/tests/munsterberg/types';
import {
	campimetryAttempt,
	mathAttempt,
	memoryAttempt,
	munsterbergAttempt,
	stroopAttempt,
	swallowAttempt
} from './models/tests';

function rnd(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndBool(pCorrect = 0.7) {
	return Math.random() < pCorrect;
}

const COLORS: Color[] = ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'];
const STROOP_TASKS: ('both' | 'meaning' | 'color')[] = ['both', 'meaning', 'color'];
const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];
const BACKGROUNDS: Background[] = ['red', 'blue'];
const SIGNS: Sign[] = ['>', '<', '>=', '<=', '=', '!='];
const SILHOUETTES = ['bird', 'tree', 'house', 'fish', 'star'];
const CHANNELS: ('a' | 'b')[] = ['a', 'b'];
const OPS: ('+' | '-')[] = ['+', '-'];
const MUNSTERBERG_WORDS = [
	'СОЛНЦЕ',
	'ДОРОГА',
	'КОРАБЛЬ',
	'ПТИЦА',
	'ЗЕРКАЛО',
	'ВОЛНА',
	'ГОРОД',
	'КНИГА'
];

function genStroop(n: number): StroopResult[] {
	return Array.from({ length: n }, (_, i) => ({
		stage: i < 5 ? 1 : i < 15 ? 2 : 3,
		attempt: i,
		time: rnd(300, 2000),
		word: COLORS[rnd(0, 5)],
		color: COLORS[rnd(0, 5)],
		task: STROOP_TASKS[rnd(0, 2)],
		userAnswer: COLORS[rnd(0, 5)],
		isCorrect: rndBool()
	}));
}

function genMath(n: number): MathResult[] {
	return Array.from({ length: n }, (_, i) => ({
		stage: 1,
		attempt: i,
		time: rnd(300, 2500),
		left: rnd(-5, 15),
		sign: SIGNS[rnd(0, 4)],
		right: rnd(-5, 15),
		correctAnswer: rndBool(),
		userAnswer: rndBool() ? rndBool() : null,
		isCorrect: rndBool()
	}));
}

function genMemory(n: number): MemoryResult[] {
	const words = ['дом', 'сад', 'лес', 'река', 'гора', 'дом', 'окно', 'дверь', 'стол', 'стул'];
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		time: rnd(300, 1500),
		word: words[i % words.length],
		correctAnswer: rndBool(0.5),
		userAnswer: rndBool(0.8) ? rndBool(0.5) : null,
		isCorrect: rndBool()
	}));
}

function genCampimetry(n: number): CampimetryResult[] {
	const colorNames = Object.keys({
		'dark-magenta': {},
		'light-magenta': {},
		'dark-blue': {},
		'light-blue': {},
		'dark-green': {},
		'light-green': {},
		'dark-red': {},
		'light-red': {}
	});
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		stage: i % 2 === 0 ? 1 : 2,
		silhouette: SILHOUETTES[i % SILHOUETTES.length],
		color: colorNames[i % colorNames.length],
		channel: CHANNELS[i % 2],
		op: OPS[i % 2],
		delta: rnd(-10, 10),
		time: rnd(300, 3000)
	}));
}

function genSwallow(n: number): SwallowResult[] {
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		time: rnd(100, 800),
		direction: DIRECTIONS[rnd(0, 3)],
		background: BACKGROUNDS[i % 2],
		correctAnswer: DIRECTIONS[rnd(0, 3)],
		userAnswer: DIRECTIONS[rnd(0, 3)],
		isCorrect: rndBool()
	}));
}

function genMunsterberg(n: number): { results: MunsterbergResult[]; words: string[] } {
	const shuffled = [...MUNSTERBERG_WORDS].sort(() => Math.random() - 0.5);
	const chosen = shuffled.slice(0, Math.min(n, shuffled.length));
	const results: MunsterbergResult[] = chosen.map((word, i) => ({
		word,
		row: rnd(0, 10),
		col: rnd(0, 2),
		guessed: rndBool(),
		attempt: i,
		time: rnd(1000, 55000)
	}));
	return { results, words: chosen };
}

function getDb() {
	const url = process.env.DATABASE_URL;
	if (!url) return null;
	const client = createClient({ url });
	return drizzle(client, { schema });
}

describe.skipIf(!process.env.DATABASE_URL)('seed results', () => {
	it('populates last-active user with random test results', async () => {
		const db = getDb();
		expect(db).not.toBeNull();

		const [lastUser] = await db
			.select()
			.from(user)
			.orderBy(sql`${user.lastActiveAt} DESC`)
			.limit(1);

		expect(lastUser).toBeDefined();
		expect(lastUser.id).toBeDefined();

		const stroopSessionId = await postResult(genStroop(25), 'stroop', lastUser.id, db);
		const mathSessionId = await postResult(genMath(10), 'math', lastUser.id, db);
		const memorySessionId = await postResult(genMemory(10), 'memory', lastUser.id, db);
		const campimetrySessionId = await postResult(
			genCampimetry(20),
			'campimetry',
			lastUser.id,
			db
		);
		const swallowSessionId = await postResult(genSwallow(100), 'swallow', lastUser.id, db);
		const { results: munResults } = genMunsterberg(8);
		const munsterbergSessionId = await postResult(munResults, 'munsterberg', lastUser.id, db);

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
