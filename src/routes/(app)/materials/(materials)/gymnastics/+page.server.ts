import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/db';
import type { User } from '$lib/types/index.js';

export const load = (async ({ cookies }) => {
	const userId = cookies.get('user_id');
	const user: User | null = await getUserById(userId || '');

	return { user };
}) satisfies PageServerLoad;

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = false;

// страница зависит от cookies (пол пользователя для видео),
// поэтому пререндерить её нельзя
export const prerender = false;
