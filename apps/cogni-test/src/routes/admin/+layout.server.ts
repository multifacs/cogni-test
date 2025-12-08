import { getUserById } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	const user = await getUserById(userId);
	if (!user) {
		cookies.delete('user_id', { path: '/' });
		redirect(307, '/');
	}

	return {
		user
	};
};
