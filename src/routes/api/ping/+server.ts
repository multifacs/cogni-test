import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		return json({ success: true }, { status: 401 });
	}

	const [userRow] = await db
		.select({ lastActiveAt: user.lastActiveAt })
		.from(user)
		.where(eq(user.id, userId));

	const now = new Date();
	const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

	if (userRow?.lastActiveAt) {
		const lastActive = new Date(userRow.lastActiveAt);
		if (lastActive > fiveMinutesAgo) {
			return json({ success: true });
		}
	}

	await db
		.update(user)
		.set({ lastActiveAt: now.toISOString() })
		.where(eq(user.id, userId));

	return json({ success: true });
};
