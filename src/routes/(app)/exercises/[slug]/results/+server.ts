import { getResults } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { ExerciseType } from '$lib/exercises/types.js';
import type { RequestHandler } from '@sveltejs/kit';

const EXERCISES_WITH_RESULTS: ExerciseType[] = [
	'attention',
	'emoji',
	'flanker',
	'letters',
	'numbers',
	'pictures',
	'ravenMatrices'
];

export const GET: RequestHandler = async ({ params, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.includes(slug as ExerciseType)) {
		return json({ results: [] });
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults(slug as ExerciseType, userId);
	return json({ results });
};
