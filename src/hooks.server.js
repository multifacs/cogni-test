import { getDb } from '$lib/server/db';

// Initialize DB on server start
let db;
export async function handle({ event, resolve }) {
	if (!db) {
		db = await getDb();
	}
	event.locals.db = db;
	return resolve(event);
}
