import type { PageServerLoad } from './$types';
import { getMetricScores } from '$lib/shared/metrics';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		return { metricScores: {} as Record<string, number> };
	}
	const metricScores = await getMetricScores(userId);
	return { metricScores };
};
