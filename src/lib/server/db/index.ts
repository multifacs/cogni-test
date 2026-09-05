export * from './controllers/user';

import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { classifyDatabaseUrl } from './db-url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

async function enableWAL(client: Client) {
	try {
		await client.execute('PRAGMA journal_mode=WAL;');
		const result = await client.execute('PRAGMA journal_mode;');
		const mode = result.rows[0][0];
		console.log(`[SQLite] journal mode is set to: ${mode}`);
		if (mode !== 'wal') {
			console.warn('[SQLite] WAL mode not enabled! Default mode:', mode);
		}
	} catch (err) {
		console.error('[SQLite] Failed to enable WAL:', err);
	}
}

export let db!: LibSQLDatabase<typeof schema>;

import { env } from '$env/dynamic/private';

const classified = classifyDatabaseUrl(env.DATABASE_URL);

switch (classified.mode) {
	case 'unset': {
		throw new Error(
			'DATABASE_URL is not set. Запустите scripts/generate-dev-env или задайте переменную вручную'
		);
	}
	case 'memory': {
		if (process.env.NODE_ENV !== 'test') {
			console.warn(
				'[SQLite] Running with an in-memory database. All data will be lost on restart.'
			);
		}
		const client = createClient({ url: ':memory:' });
		db = drizzle(client, { schema });
		const __dirname = dirname(fileURLToPath(import.meta.url));
		const migrationsFolder = join(__dirname, '../../../../drizzle');
		await migrate(db, { migrationsFolder });
		break;
	}
	case 'file': {
		const resolved = join(process.cwd(), classified.path);
		if (!existsSync(resolved)) {
			throw new Error(
				`SQLite file database not found at ${resolved}. Run: npm run init-db-dev (или npm run db:push) чтобы создать файл и применить схему.`
			);
		}
		const client = createClient({ url: env.DATABASE_URL });
		await enableWAL(client);
		db = drizzle(client, { schema });
		break;
	}
	case 'remote': {
		const client = createClient({ url: env.DATABASE_URL });
		await enableWAL(client);
		db = drizzle(client, { schema });
		break;
	}
}
