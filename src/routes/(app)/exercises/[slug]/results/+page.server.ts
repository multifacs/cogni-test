import { getResults } from '$lib/server/db/controllers/result.js';
import type { ExerciseType } from '$lib/exercises/types.js';
import type { PageServerLoad } from './$types';

const EXERCISES_WITH_RESULTS: ExerciseType[] = [
	'attention',
	'emoji',
	'flanker',
	'letters',
	'numbers',
	'pictures',
	'ravenMatrices'
];

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug as ExerciseType)) {
		return { results: [] };
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(slug as ExerciseType, userId);
	return { results };
};
