import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, onTestFinished } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';
import {
	assertDatabaseMatchesSchema,
	diffSchemas,
	extractExpectedTables,
	formatSchemaDiff,
	type SchemaDiff
} from './schema-check';

const here = fileURLToPath(import.meta.url);
// src/lib/server/db -> repo root (4 levels up)
const repoRoot = join(here, '..', '..', '..', '..', '..');

const minimalUser = {
	user: sqliteTable('user', {
		id: text('id').primaryKey(),
		name: text('name')
	})
};

async function createTempFileClient(): Promise<{ client: Client; cleanup: () => Promise<void> }> {
	const dir = await mkdtemp(join(tmpdir(), 'schema-check-'));
	const client = createClient({ url: `file:${join(dir, 'test.db')}` });
	const cleanup = async () => {
		client.close();
		await rm(dir, { recursive: true, force: true });
	};
	return { client, cleanup };
}

/** Latest drizzle/meta snapshot: file with the highest numeric prefix. */
async function readLatestSnapshotTables(): Promise<Set<string>> {
	const metaDir = join(repoRoot, 'drizzle', 'meta');
	const files = await readdir(metaDir);
	const snapshots = files
		.filter((f) => /^\d+_snapshot\.json$/.test(f))
		.sort((a, b) => parseInt(a) - parseInt(b));
	if (snapshots.length === 0) throw new Error(`No snapshot files found in ${metaDir}`);
	const latest = snapshots[snapshots.length - 1];
	const raw = JSON.parse(await readFile(join(metaDir, latest), 'utf-8')) as {
		tables: Record<string, unknown>;
	};
	return new Set(Object.keys(raw.tables));
}

describe('extractExpectedTables', () => {
	it('extracts exactly the tables exported by the real schema', () => {
		const expected = extractExpectedTables(schema);
		expect(expected.size).toBe(27);
		// DB column names, not TS keys (firstname -> first_name)
		expect(expected.get('user')).toContain('first_name');
		expect(expected.get('user')).not.toContain('firstname');
	});

	it('matches the table names in the latest drizzle snapshot (reexport drift guard)', async () => {
		const expected = extractExpectedTables(schema);
		const snapshotTables = await readLatestSnapshotTables();
		expect([...expected.keys()].sort()).toEqual([...snapshotTables].sort());
	});

	it('ignores non-table exports', () => {
		const withJunk = { ...schema, notATable: () => {}, alsoNot: 42 };
		expect(extractExpectedTables(withJunk).size).toBe(27);
	});
});

describe('diffSchemas', () => {
	it('returns empty diff for identical maps', () => {
		const a = new Map([
			['user', new Set(['id', 'name'])],
			['session', new Set(['id'])]
		]);
		expect(diffSchemas(a, a)).toEqual({ missingTables: [], missingColumnsByTable: {} });
	});

	it('lists missing tables sorted', () => {
		const expected = new Map([
			['user', new Set(['id'])],
			['zzz', new Set(['id'])],
			['alpha', new Set(['id'])]
		]);
		const actual = new Map([['user', new Set(['id'])]]);
		expect(diffSchemas(expected, actual).missingTables).toEqual(['alpha', 'zzz']);
	});

	it('lists missing columns sorted per table', () => {
		const expected = new Map([['user', new Set(['b', 'a', 'c'])]]);
		const actual = new Map([['user', new Set(['c'])]]);
		expect(diffSchemas(expected, actual).missingColumnsByTable).toEqual({
			user: ['a', 'b']
		});
	});

	it('ignores extra tables and columns in actual', () => {
		const expected = new Map([['user', new Set(['id'])]]);
		const actual = new Map([
			['user', new Set(['id', 'bonus'])],
			['drizzle_migrations', new Set(['id'])]
		]);
		expect(diffSchemas(expected, actual)).toEqual({
			missingTables: [],
			missingColumnsByTable: {}
		});
	});

	it('normalizes case before comparing', () => {
		const expected = new Map([['user', new Set(['name'])]]);
		const actual = new Map([['USER', new Set(['NAME'])]]);
		expect(diffSchemas(expected, actual)).toEqual({
			missingTables: [],
			missingColumnsByTable: {}
		});
	});
});

describe('formatSchemaDiff', () => {
	it('formats missing tables and columns in Russian', () => {
		const diff: SchemaDiff = {
			missingTables: ['alpha', 'zzz'],
			missingColumnsByTable: { user: ['first_name', 'last_name'] }
		};
		const msg = formatSchemaDiff(diff, './data/dev.db');
		expect(msg).toContain('./data/dev.db');
		expect(msg).toContain('alpha, zzz');
		expect(msg).toContain('user');
		expect(msg).toContain('first_name, last_name');
		expect(msg).toContain('db:push');
	});

	it('returns a sane message for an empty diff', () => {
		const msg = formatSchemaDiff({ missingTables: [], missingColumnsByTable: {} }, 'x.db');
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});
});

describe('assertDatabaseMatchesSchema (integration)', () => {
	it('passes when the full migration chain matches the real schema', async () => {
		const { client, cleanup } = await createTempFileClient();
		onTestFinished(cleanup);
		await migrate(drizzle(client), { migrationsFolder: join(repoRoot, 'drizzle') });
		await expect(assertDatabaseMatchesSchema(client, schema)).resolves.toBeUndefined();
	});

	it('throws listing the missing column when a table lacks it', async () => {
		const { client, cleanup } = await createTempFileClient();
		onTestFinished(cleanup);
		await client.execute('CREATE TABLE user (id TEXT PRIMARY KEY)');
		const err: unknown = await assertDatabaseMatchesSchema(client, minimalUser).catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect((err as Error).message).toContain('user');
		expect((err as Error).message).toContain('name');
	});

	it('throws listing the entirely absent table', async () => {
		const { client, cleanup } = await createTempFileClient();
		onTestFinished(cleanup);
		await expect(assertDatabaseMatchesSchema(client, minimalUser)).rejects.toThrow(/user/);
	});

	it('uses the custom dbLabel in the thrown message', async () => {
		const { client, cleanup } = await createTempFileClient();
		onTestFinished(cleanup);
		const err: unknown = await assertDatabaseMatchesSchema(
			client,
			minimalUser,
			'./data/dev.db'
		).catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect((err as Error).message).toContain('./data/dev.db');
		expect((err as Error).message).toContain('db:push');
		expect((err as Error).message).not.toContain('Файл БД DATABASE_URL');
	});

	it('does not throw when DB columns differ only by case', async () => {
		const { client, cleanup } = await createTempFileClient();
		onTestFinished(cleanup);
		await client.execute('CREATE TABLE user (ID TEXT PRIMARY KEY, NAME TEXT)');
		await expect(assertDatabaseMatchesSchema(client, minimalUser)).resolves.toBeUndefined();
	});

	it('returns immediately for an empty schema without querying', async () => {
		const { client, cleanup } = await createTempFileClient();
		onTestFinished(cleanup);
		await expect(assertDatabaseMatchesSchema(client, {})).resolves.toBeUndefined();
	});
});
