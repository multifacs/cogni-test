import type { PageServerLoad } from './$types';
import { getUsersAnalytics } from '$lib/server/db/controllers/user';

export const load: PageServerLoad = async () => {
	const users = await getUsersAnalytics();

	return {
		users
	};
};
