import { getUserById } from '$lib/server/db';
import type { User } from '$lib/types/index.js';
import { redirect } from '@sveltejs/kit';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_API_URL, MODE } from '$env/static/private';

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
		user,
		VAPID_PRIVATE_KEY,
		VAPID_PUBLIC_KEY,
		PUSH_API_URL,
		MODE
	};
};
