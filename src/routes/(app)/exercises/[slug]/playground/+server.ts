import { db } from '$lib/server/db';
import { ravenAnswer } from '$lib/server/db/models/exercises';
import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { ExerciseResults, MetaResult, ExerciseType } from '$lib/exercises/types.js';
import type { RequestHandler } from '@sveltejs/kit';

const SLUG_TO_EXERCISE_TYPE: Record<string, ExerciseType> = {
	attention: 'attention',
	emoji: 'emoji',
	flanker: 'flanker',
	letters: 'letters',
	numbers: 'numbers',
	pictures: 'pictures',
	'raven-matrices': 'ravenMatrices'
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug!;
	const exerciseType = SLUG_TO_EXERCISE_TYPE[slug];
	if (!slug || !exerciseType) {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const userId = cookies.get('user_id') as string;

	if (slug === 'raven-matrices') {
		const body = await request.json();
		const { summary, answers } = body as {
			summary: Record<string, unknown>;
			answers: Array<Record<string, unknown>>;
		};

		const sessionId = await postResult([summary] as any, 'ravenMatrices', userId);

		const attemptRow = await db.query.ravenAttempt.findFirst({
			where: (fields, { eq }) => eq(fields.sessionId, sessionId)
		});

		if (attemptRow && answers.length > 0) {
			await db.insert(ravenAnswer).values(
				answers.map((a) => ({
					taskId: String(a.taskId),
					taskIndex: Number(a.taskIndex),
					taskClass: String(a.taskClass),
					difficultyLevel: Number(a.difficultyLevel),
					difficultyScore: Number(a.difficultyScore),
					rules: JSON.stringify(a.rules ?? []),
					skillTags: JSON.stringify(a.skillTags ?? []),
					selectedIndex: a.selectedIndex != null ? Number(a.selectedIndex) : null,
					correctIndex: Number(a.correctIndex),
					selectedFamily: a.selectedFamily != null ? String(a.selectedFamily) : null,
					isCorrect: Boolean(a.isCorrect),
					responseTimeMs: Number(a.responseTimeMs),
					seed: String(a.seed),
					ravenAttemptId: attemptRow.id
				}))
			);
		}

		return json('success', { status: 201 });
	}

	const { results }: { results: ExerciseResults | MetaResult } = await request.json();
	await postResult(results, exerciseType, userId);
	return json('success', { status: 201 });
};
