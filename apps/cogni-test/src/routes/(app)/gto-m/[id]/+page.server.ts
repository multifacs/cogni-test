import { redirect } from '@sveltejs/kit';
import { getSessionById } from '$lib/server/db/controllers/gto-m';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const userId = cookies.get('user_id');

	if (!userId) {
		redirect(307, '/');
	}

	const sessionId = params.id;

    const session = await getSessionById(sessionId);

	return {
		userId,
        session
	};
};
