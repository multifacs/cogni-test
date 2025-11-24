import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export async function GET() {
	const result = db.select().from(user).all();
	return json(result);
}
