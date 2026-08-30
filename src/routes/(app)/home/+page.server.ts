import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

import { tests } from '$lib/tests';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	const visibleTests = tests.filter((t) => !t.hidden);
	const testSessionCounts = await getTestSessionCounts(userId);

	const hasUnfinishedTests = Object.keys(testSessionCounts).length < visibleTests.length;
	const loggedInAdmin = cookies.get('logged_in_admin'); // logged in admins should be able to access all pages

	return {
		hasUnfinishedTests,
		loggedInAdmin
	};
};
