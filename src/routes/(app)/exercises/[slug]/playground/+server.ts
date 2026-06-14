import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { ExerciseResults, MetaResult, ExerciseType } from '$lib/exercises/types.js';
import type { RequestHandler } from '@sveltejs/kit';

const EXERCISES_WITH_RESULTS = new Set<string>([
	'attention',
	'emoji',
	'flanker',
	'letters',
	'numbers',
	'pictures',
	'ravenMatrices'
]);

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	if (!EXERCISES_WITH_RESULTS.has(slug)) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const { results }: { results: ExerciseResults | MetaResult } = await request.json();
	const userId = cookies.get('user_id') as string;

	await postResult(results, slug as ExerciseType, userId);
	return json('success', { status: 201 });
};
