import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markParticipantTestsCompleted, getGtoSessionById } from '$lib/server/db/controllers/gto';
import { postResult } from '$lib/server/db/controllers/result';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { gtoSession } from '$lib/server/db/models/gto';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	// Verify user is a participant of this session
	const sessionDetail = await getGtoSessionById(params.id);
	const participant = sessionDetail.participants.find((p) => p.userId === userId);
	if (!participant) return json({ error: 'Forbidden' }, { status: 403 });

	const body = await request.json();
	const action = body.action;

	// Action: save individual test result and link to GTO session
	if (action === 'save-result') {
		const { testType, results } = body;
		if (!testType || !results) {
			return json({ error: 'Missing testType or results' }, { status: 400 });
		}

		const sessionId = await postResult(results, testType, userId);
		await db.update(session).set({ gtoSessionId: params.id }).where(eq(session.id, sessionId));

		return json({ success: true, sessionId });
	}

	// Action: mark all tests as completed for this participant
	if (action === 'complete') {
		try {
			await markParticipantTestsCompleted(params.id, userId);
			return json({ success: true });
		} catch (e: any) {
			return json({ error: e.message }, { status: 400 });
		}
	}

	// Action: checkpoint — update currentTestIndex
	if (action === 'checkpoint') {
		const { currentTestIndex } = body;
		if (typeof currentTestIndex !== 'number') {
			return json({ error: 'currentTestIndex required' }, { status: 400 });
		}
		const result = await db
			.update(gtoSession)
			.set({ currentTestIndex })
			.where(eq(gtoSession.id, params.id));
		if (result.rowsAffected === 0) {
			return json({ error: 'Session not found' }, { status: 404 });
		}
		return json({ success: true });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};
