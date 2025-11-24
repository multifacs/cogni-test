export * from './controllers/user';

import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// export const db = env.DATABASE_URL
// 	? drizzle(createClient({ url: env.DATABASE_URL }), { schema })
// 	: null;

export let db: any = null;

if (env.DATABASE_URL) {
	const client = createClient({ url: env.DATABASE_URL });
	await enableWAL(client);

	db = drizzle(client, { schema });
}

/**
 * Включает WAL для SQLite и логирует результат
 */
async function enableWAL(client: Client) {
	try {
		// Включаем WAL
		await client.execute("PRAGMA journal_mode=WAL;");

		// Проверяем, что реально включилось
		const result = await client.execute("PRAGMA journal_mode;");
		const mode = result.rows[0][0];

		console.log(`[SQLite] journal mode is set to: ${mode}`);

		if (mode !== "wal") {
			console.warn("[SQLite] WAL mode not enabled! Default mode:", mode);
		}
	} catch (err) {
		console.error("[SQLite] Failed to enable WAL:", err);
	}
}