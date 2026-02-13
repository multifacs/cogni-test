import { getAllUsers } from '$lib/server/db';
import type { PageServerLoad } from '../../$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	const users = await getAllUsers();
	return { users, userId };
};
