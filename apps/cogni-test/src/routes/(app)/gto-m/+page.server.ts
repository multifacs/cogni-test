import { getGtoSessionsByUserId } from '$lib/server/db/controllers/gto-m';
import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from '../../$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');

	if (!userId) {
		redirect(307, '/');
	}

    const sessions = await getGtoSessionsByUserId(userId);

	return { sessions };
};
