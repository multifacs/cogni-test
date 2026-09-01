import type { PageServerLoad } from './$types';
import { tests } from '$lib/tests';
import { getMetricScores, getRecommendations } from '$lib/shared/metrics';
import { redirect } from '@sveltejs/kit';
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
  
  const metricScores = await getMetricScores(userId);
	const hasData = Object.values(metricScores).some((s) => s > 0);

	let recommendations = getRecommendations(metricScores);
	if (recommendations.length === 0) {
		recommendations = tests
			.filter((t) => !t.hidden)
			.sort(() => 0.5 - Math.random())
			.slice(0, 3)
			.map((t) => ({
				name: t.name,
				title: t.title,
				path: t.path,
				img: t.img
			}));
	}

	return {
    recommendations,
    metricScores,
    hasData,
		hasUnfinishedTests,
		loggedInAdmin
	};
};
