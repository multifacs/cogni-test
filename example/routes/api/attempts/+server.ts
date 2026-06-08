import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordAttempt } from '$lib/server/stats/record';
import type { AttemptSubmitPayload, AttemptCreatedResponse } from '$lib/stats/contracts';

const VALID_SLUGS = new Set([
	'stroop',
	'attention',
	'memory1',
	'memory2',
	'flanker',
	'letter',
	'emoji'
]);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	let payload: AttemptSubmitPayload;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	if (!payload?.testSlug || !VALID_SLUGS.has(payload.testSlug)) {
		throw error(400, 'Invalid or missing testSlug');
	}
	if (typeof payload.durationMs !== 'number' || payload.durationMs < 0) {
		throw error(400, 'Invalid durationMs');
	}
	if (typeof payload.score !== 'number' || typeof payload.maxScore !== 'number') {
		throw error(400, 'Invalid score/maxScore');
	}
	if (!Array.isArray(payload.answers)) {
		throw error(400, 'Invalid answers (must be an array)');
	}

	const attemptId = await recordAttempt(locals.user.id, payload);

	const response: AttemptCreatedResponse = { attemptId };
	return json(response, { status: 201 });
};
