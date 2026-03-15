import { exercises } from '$lib/exercises';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	let predictedAge = null;
	if (!userId) return { exercises };

	const features = await getFeaturesFromDB(userId);
	if (features) predictedAge = await runAgeModel(features);
	console.log(predictedAge)
	return {
		exercises,
		userId,
		predictedAge
	};
}
