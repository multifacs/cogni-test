import {
	createWordMorphingSession,
	getWordMorphingSessionByUserId,
	deleteWordMorphingSessionByUserId
} from '$lib/server/db/controllers/wordMorphingSessions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('user_id');

	if (!userId) {
		return json({ error: 'Missing userId parameter' }, { status: 401 });
	}

	try {
		const session = await getWordMorphingSessionByUserId(userId);

		if (!session) {
			return json({ error: 'No active session' }, { status: 404 });
		}

		return json(session, { status: 200 });
	} catch (error) {
		return json({ error: 'Failed to get word morphing session' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { timerValueInSeconds, expectedCombos, category } = await request.json();
	const userId = cookies.get('user_id');
	const timerStartedAt = new Date();

	if (!userId) {
		return json({ error: 'Missing userId cookie' }, { status: 401 });
	}

	try {
		await createWordMorphingSession(
			userId,
			category,
			expectedCombos,
			timerStartedAt,
			parseInt(timerValueInSeconds)
		);
		return json({ success: true }, { status: 201 });
	} catch (error) {
		return json({ error: `Failed to create word morphing session: ${error}` }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('user_id');

	if (!userId) {
		return json({ error: 'Missing userId cookie' }, { status: 401 });
	}

	try {
		await deleteWordMorphingSessionByUserId(userId);
		return json({ success: true }, { status: 200 });
	} catch (error) {
		return json({ error: 'Failed to delete word morphing session' }, { status: 500 });
	}
};
