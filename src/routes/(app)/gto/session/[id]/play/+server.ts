import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markParticipantTestsCompleted, getGtoSessionById } from '$lib/server/db/controllers/gto';
import { postResult } from '$lib/server/db/controllers/result';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { gtoSessionParticipant } from '$lib/server/db/models/gto';
import { eq, and } from 'drizzle-orm';
import { GTO_TEST_ORDER, gtoTestAboutUrl } from '$lib/tests';

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

		// Advance checkpoint: find next test index
		const currentIdx = GTO_TEST_ORDER.findIndex((e) => e.type === testType);
		const nextIdx = currentIdx + 1;

		if (nextIdx >= GTO_TEST_ORDER.length) {
			// All tests done
			await markParticipantTestsCompleted(params.id, userId);
		} else {
			// Update checkpoint to next test
			await db
				.update(gtoSessionParticipant)
				.set({ currentTestIndex: nextIdx })
				.where(
					and(
						eq(gtoSessionParticipant.gtoSessionId, params.id),
						eq(gtoSessionParticipant.userId, userId)
					)
				);
		}

		return json({
			success: true,
			sessionId,
			nextTestIndex: nextIdx,
			nextTestUrl:
				nextIdx < GTO_TEST_ORDER.length
					? gtoTestAboutUrl(GTO_TEST_ORDER[nextIdx].type, nextIdx, params.id)
					: null
		});
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

	// Action: checkpoint — update currentTestIndex on participant
	if (action === 'checkpoint') {
		const { currentTestIndex } = body;
		if (typeof currentTestIndex !== 'number') {
			return json({ error: 'currentTestIndex required' }, { status: 400 });
		}
		const result = await db
			.update(gtoSessionParticipant)
			.set({ currentTestIndex })
			.where(
				and(
					eq(gtoSessionParticipant.gtoSessionId, params.id),
					eq(gtoSessionParticipant.userId, userId)
				)
			);
		if (result.rowsAffected === 0) {
			return json({ error: 'Participant not found' }, { status: 404 });
		}
		return json({ success: true });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};
