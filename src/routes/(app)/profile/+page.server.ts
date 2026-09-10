import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	let predictedAge: number | null = null;

	if (userId) {
		// та же логика, что в /tests — считаем когнитивный возраст по фичам из БД
		const features = await getFeaturesFromDB(userId);
		if (features) {
			const cleanFeatures = Object.fromEntries(
				Object.entries(features).filter(([, v]) => v !== null)
			) as Record<string, number>;
			if (Object.keys(cleanFeatures).length > 0) {
				predictedAge = await runAgeModel(cleanFeatures);
			}
		}
	}

	return { predictedAge };
};
