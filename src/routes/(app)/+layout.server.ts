import { getUserById } from '$lib/server/db';
import type { User } from '$lib/types/index.js';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	const user: User = await getUserById(userId);
	if (!user) {
		cookies.delete('user_id', { path: '/' });
		redirect(307, '/');
	}

	return {
		user
	};
};
