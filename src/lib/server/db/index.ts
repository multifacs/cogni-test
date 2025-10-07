export * from './controllers/user';

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

async function createTables(db) {
	await db.run(sql`
		CREATE TABLE IF NOT EXISTS user (
			id TEXT PRIMARY KEY,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			birthday INTEGER NOT NULL,
			sex TEXT NOT NULL CHECK(sex IN ('male', 'female')),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			test_type TEXT NOT NULL,
			meta TEXT,
			user_id TEXT NOT NULL REFERENCES user(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS push_subscriptions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT,
			endpoint TEXT NOT NULL,
			p256dh TEXT NOT NULL,
			auth TEXT NOT NULL,
			user_agent TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			is_active INTEGER NOT NULL DEFAULT 1
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS campimetry_attempt (
			id TEXT PRIMARY KEY,
			attempt INTEGER NOT NULL,
			stage INTEGER NOT NULL,
			silhouette TEXT NOT NULL,
			channel TEXT NOT NULL CHECK(channel IN ('a', 'b')),
			op TEXT NOT NULL CHECK(op IN ('+', '-')),
			color TEXT NOT NULL CHECK(color IN ('black', 'white', 'dark-magenta', 'light-magenta', 'dark-blue', 'light-blue', 'dark-green', 'light-green', 'dark-red', 'light-red')),
			delta INTEGER NOT NULL,
			time INTEGER NOT NULL,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS math_attempt (
			id TEXT PRIMARY KEY,
			attempt INTEGER NOT NULL,
			stage INTEGER NOT NULL,
			time INTEGER NOT NULL,
			left TEXT NOT NULL,
			sign TEXT NOT NULL CHECK(sign IN ('>', '<', '>=', '<=', '=', '!=')),
			right TEXT NOT NULL,
			correct_answer INTEGER NOT NULL,
			user_answer INTEGER,
			is_correct INTEGER NOT NULL DEFAULT 0,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS memory_attempt (
			id TEXT PRIMARY KEY,
			attempt INTEGER NOT NULL,
			time INTEGER NOT NULL,
			word TEXT NOT NULL,
			correct_answer INTEGER NOT NULL,
			user_answer INTEGER,
			is_correct INTEGER NOT NULL DEFAULT 0,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS munsterberg_attempt (
			id TEXT PRIMARY KEY,
			word TEXT NOT NULL,
			row INTEGER NOT NULL,
			col INTEGER NOT NULL,
			guessed INTEGER NOT NULL,
			attempt INTEGER NOT NULL,
			time INTEGER NOT NULL,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS stroop_attempt (
			id TEXT PRIMARY KEY,
			stage INTEGER NOT NULL,
			attempt INTEGER NOT NULL,
			time INTEGER NOT NULL,
			word TEXT NOT NULL,
			color TEXT NOT NULL CHECK(color IN ('red', 'blue', 'green', 'cyan', 'magenta', 'yellow')),
			task TEXT NOT NULL CHECK(task IN ('both', 'meaning', 'color')),
			user_answer TEXT,
			is_correct INTEGER NOT NULL DEFAULT 0,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS swallow_attempt (
			id TEXT PRIMARY KEY,
			attempt INTEGER NOT NULL,
			time INTEGER NOT NULL,
			direction TEXT NOT NULL CHECK(direction IN ('up', 'right', 'down', 'left')),
			background TEXT NOT NULL CHECK(background IN ('red', 'blue')),
			correct_answer TEXT NOT NULL CHECK(correct_answer IN ('up', 'right', 'down', 'left')),
			user_answer TEXT CHECK(user_answer IN ('up', 'right', 'down', 'left')),
			is_correct INTEGER NOT NULL DEFAULT 0,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS rhythm_attempt (
			id TEXT PRIMARY KEY,
			attempt INTEGER NOT NULL,
			note INTEGER NOT NULL,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	await db.run(sql`
		CREATE TABLE IF NOT EXISTS memory_match_attempt (
			id TEXT PRIMARY KEY,
			attempt INTEGER NOT NULL,
			time INTEGER NOT NULL,
			stage INTEGER NOT NULL,
			cards INTEGER NOT NULL,
			flips INTEGER NOT NULL,
			mistakes INTEGER NOT NULL,
			efficiency INTEGER NOT NULL,
			is_correct INTEGER NOT NULL DEFAULT 1,
			session_id TEXT NOT NULL REFERENCES session(id),
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);
}

async function initInMemory() {
	const client = createClient({ url: ':memory:' });
	const db = drizzle(client, { schema });

	// Create all tables
	await createTables(db);

	return db;
}

let dbInstance = null;
let dbPromise = null;

export async function getDb() {
	if (!dbInstance) {
		if (!dbPromise) {
			dbPromise = initInMemory();
		}
		dbInstance = await dbPromise;
	}
	return dbInstance;
}

// Initialize immediately for module-level access
dbPromise = initInMemory();
export const db = await dbPromise;
