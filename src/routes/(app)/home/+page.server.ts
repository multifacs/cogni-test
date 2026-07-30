import type { PageServerLoad } from './$types';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');

	let predictedAge: number | null = null;

	if (!userId) {
		return {
			predictedAge: null
		};
	}

	const features = await getFeaturesFromDB(userId);

	if (features) {
		predictedAge = await runAgeModel(features);
	}

	return {
		predictedAge
	};
};
