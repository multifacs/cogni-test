import { getResults } from '$lib/server/db/controllers/result.js';
import type { ExerciseType } from '$lib/exercises/types.js';
import type { PageServerLoad } from './$types';

const slugToExerciseType: Record<string, ExerciseType> = {
	attention: 'attention',
	emoji: 'emoji',
	flanker: 'flanker',
	letters: 'letters',
	numbers: 'numbers',
	pictures: 'pictures',
	'raven-matrices': 'ravenMatrices'
};

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	const exerciseType = slugToExerciseType[slug];
	if (!exerciseType) {
		return { results: [] };
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(exerciseType, userId);
	return { results };
};
