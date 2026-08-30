import type { PageServerLoad } from './$types';
import { tests } from '$lib/tests';
import { getMetricScores, getRecommendations } from '$lib/shared/metrics';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		const recommendations = [...tests]
			.sort(() => 0.5 - Math.random())
			.slice(0, 3);
		return {
			recommendations,
			metricScores: {} as Record<string, number>,
			hasData: false
		};
	}

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

	return { recommendations, metricScores, hasData };
};
