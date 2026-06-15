import { exercises } from '$lib/exercises';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import type { PageServerLoad } from './$types';

const exerciseToSessionType: Record<string, string> = {
	'word-morphing': 'wordMorphingExercise',
	campimetry: 'campimetryExercise',
	'memory-match': 'memoryMatchExercise',
	'nback-stream': 'nbackExercise',
	'raven-matrices': 'ravenMatrices',
	emoji: 'emoji',
	attention: 'attention',
	pictures: 'pictures',
	numbers: 'numbers',
	flanker: 'flanker',
	letters: 'letters',
	'road-trip': 'road-trip',
	'not-lost': 'not-lost'
};

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	let predictedAge = null;
	let exerciseSessionCounts: Record<string, number> = {};
	if (!userId) return { exercises };

	const features = await getFeaturesFromDB(userId);
	if (features) predictedAge = await runAgeModel(features);

	const rawCounts = await getTestSessionCounts(userId);
	for (const ex of exercises) {
		const sessionType = exerciseToSessionType[ex.name];
		if (sessionType && rawCounts[sessionType]) {
			exerciseSessionCounts[ex.name] = rawCounts[sessionType];
		}
	}

	return {
		exercises,
		userId,
		predictedAge,
		exerciseSessionCounts
	};
};
