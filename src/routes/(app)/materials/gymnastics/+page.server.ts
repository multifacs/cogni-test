import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/db';
import type { User } from '$lib/types/index.js';

export const load = (async ({ cookies }) => {
	const userId = cookies.get('user_id');
	const user: User = (await getUserById(userId)) || null;

	return { user };
}) satisfies PageServerLoad;
