/**
 * Module-init tests for $lib/server/db file-mode branch.
 *
 * CRITICAL patterns (same as seed tests):
 * - NEVER import '$lib/server/db' at top level: the module reads DATABASE_URL
 *   at init and runs the schema guard at import time.
 * - vi.resetModules() + dynamic import INSIDE it(), env set before the import.
 * - afterEach MUST delete process.env.DATABASE_URL so it does not leak.
 * - Temp DBs live in os.tmpdir() and are fully removed (incl. -wal/-shm);
 *   the real sqlite.db / local.db are never touched.
 *
 * Two environment quirks these tests work around:
 * 1. Under vitest (command === 'serve') SvelteKit generates
 *    `$env/dynamic/private` as a static module with values baked from .env at
 *    config load time — runtime changes to process.env are invisible. We mock
 *    it with a Proxy over process.env so the db module sees the value we set
 *    inside the test.
 * 2. The file-mode branch resolves the path as join(process.cwd(), path), so
 *    an absolute path would be mangled. We therefore build the DATABASE_URL
 *    from a path RELATIVE to process.cwd() pointing into the temp dir.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

vi.mock('$env/dynamic/private', () => ({
	env: new Proxy(
		{},
		{
			get: (_, key: string) => process.env[key] as string | undefined
		}
	)
}));

const here = fileURLToPath(import.meta.url);
// src/lib/server/db -> repo root (4 levels up)
const repoRoot = join(here, '..', '..', '..', '..', '..');

afterEach(() => {
	delete process.env.DATABASE_URL;
});

/**
 * Unique temp dir removed on test finish (covers -wal/-shm sidecar files).
 * Returns the dir path and the same path relative to process.cwd()
 * (for building a file: DATABASE_URL the db module can resolve).
 */
async function tempDbDir(prefix: string): Promise<{ dir: string; relDir: string }> {
	const dir = await mkdtemp(join(tmpdir(), prefix));
	onTestFinished(() => rm(dir, { recursive: true, force: true }));
	return { dir, relDir: relative(process.cwd(), dir) };
}

describe('$lib/server/db file-mode init', () => {
	it('rejects when the db file has an incomplete schema (missing tables)', async () => {
		const { dir, relDir } = await tempDbDir('db-init-stale-');
		const dbPath = join(dir, 'stale.db');

		const setup = createClient({ url: `file:${dbPath}` });
		await setup.execute('CREATE TABLE user (id TEXT PRIMARY KEY)');
		setup.close();

		process.env.DATABASE_URL = `file:${join(relDir, 'stale.db')}`;
		vi.resetModules();

		const err: unknown = await import('$lib/server/db').catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		const message = (err as Error).message;
		expect(message).toContain('session');
		expect(message).toContain('db:push');
		expect(message).toContain(dbPath);
	});

	it('resolves when the db file is fully migrated', async () => {
		const { dir, relDir } = await tempDbDir('db-init-fresh-');
		const dbPath = join(dir, 'fresh.db');

		const setup = createClient({ url: `file:${dbPath}` });
		await migrate(drizzle(setup), { migrationsFolder: join(repoRoot, 'drizzle') });
		setup.close();

		process.env.DATABASE_URL = `file:${join(relDir, 'fresh.db')}`;
		vi.resetModules();

		await expect(import('$lib/server/db')).resolves.toBeTruthy();
	});

	it('rejects listing many missing tables when the file has zero tables', async () => {
		const { dir, relDir } = await tempDbDir('db-init-empty-');
		const dbPath = join(dir, 'empty.db');

		const setup = createClient({ url: `file:${dbPath}` });
		// Create and drop a table so the file physically exists on disk
		// (existsSync check) but ends up with zero tables.
		await setup.execute('CREATE TABLE tmp (id TEXT)');
		await setup.execute('DROP TABLE tmp');
		setup.close();

		process.env.DATABASE_URL = `file:${join(relDir, 'empty.db')}`;
		vi.resetModules();

		const err: unknown = await import('$lib/server/db').catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		const message = (err as Error).message;
		expect(message).toContain('user');
		expect(message).toContain('db:push');
	});
});
