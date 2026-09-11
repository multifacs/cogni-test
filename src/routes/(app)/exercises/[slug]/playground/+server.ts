import { postResult } from '$lib/server/db/controllers/result.js';
import { generateDevRandomResults } from '$lib/server/db/seed/generators.js';
import { json } from '@sveltejs/kit';
import type { ExerciseResults, MetaResult, ExerciseType } from '$lib/exercises/types.js';
import type { RequestHandler } from '@sveltejs/kit';

const SLUG_TO_EXERCISE_TYPE: Record<string, ExerciseType> = {
	attention: 'attention',
	campimetry: 'campimetryExercise',
	emoji: 'emoji',
	flanker: 'flanker',
	letters: 'letters',
	'memory-match': 'memoryMatchExercise',
	'nback-stream': 'nbackExercise',
	numbers: 'numbers',
	pictures: 'pictures',
	'raven-matrices': 'ravenMatrices',
	'word-morphing': 'wordMorphingExercise',
	rhythm: 'rhythm'
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug!;
	const exerciseType = SLUG_TO_EXERCISE_TYPE[slug];
	if (!slug || !exerciseType) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const userId = cookies.get('user_id');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	const {
		results,
		sessionId,
		action
	}: { results: ExerciseResults | MetaResult; sessionId?: string; action?: string } =
		await request.json();

	if (action === 'generate-random') {
		if (slug !== 'raven-matrices') {
			return json(
				{ error: 'generate-random is only available for raven-matrices' },
				{ status: 400 }
			);
		}
		try {
			const generated = generateDevRandomResults(slug);
			return json({ results: generated }, { status: 200 });
		} catch {
			// generateDevRandomResults is fail-closed: it throws unless MODE === 'DEV'.
			return json({ error: 'Forbidden' }, { status: 403 });
		}
	}

	const storedSessionId = sessionId
		? await postResult(results, exerciseType, userId, sessionId)
		: await postResult(results, exerciseType, userId);
	return json({ sessionId: storedSessionId }, { status: 201 });
};
