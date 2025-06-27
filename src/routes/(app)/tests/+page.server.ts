import { tests } from '$lib/tests';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';

export async function load({ cookies }) {
	const userId = cookies.get('user');
	let predictedAge = null; 
	if (!userId) return { tests };
	const features = await getFeaturesFromDB(userId);
	if (features) predictedAge = await runAgeModel(features);
	console.log(predictedAge)
	return {
		tests,
		userId,
		predictedAge
	};
}
