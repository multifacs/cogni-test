import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '../../$types';
import { getUsersByAdminId } from '$lib/server/db/controllers/user-admins';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');

    if (!userId) {
		redirect(307, '/');
    }

    try {
        const users = await getUsersByAdminId(userId);
        return { users, userId };

    } catch (error) {
        redirect(307, '/admin');
    }
};
