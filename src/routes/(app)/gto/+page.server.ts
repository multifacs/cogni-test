import type { PageServerLoad } from './$types';
import { getActiveGtoSessionsForUser } from '$lib/server/db/controllers/gto';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const activeSessions = await getActiveGtoSessionsForUser(userId);
	return { activeSessions, userId };
};
