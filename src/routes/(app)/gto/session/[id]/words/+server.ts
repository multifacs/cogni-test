import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitWordScore, getGtoSessionWords, markParticipantTestsCompleted } from '$lib/server/db/controllers/gto';
import { postResult } from '$lib/server/db/controllers/result';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const action = body.action;

	// Action: save individual test result and link to GTO session
	if (action === 'save-result') {
		const { testType, results } = body;
		if (!testType || !results) {
			return json({ error: 'Missing testType or results' }, { status: 400 });
		}

		const sessionId = await postResult(results, testType, userId);
		await db
			.update(session)
			.set({ gtoSessionId: params.id })
			.where(eq(session.id, sessionId));

		return json({ success: true, sessionId });
	}

	// Action: mark all tests as completed for this participant
	if (action === 'complete') {
		await markParticipantTestsCompleted(params.id, userId);
		return json({ success: true });
	}

	// Default action: submit word score
	const { words } = body;
	if (!words || !Array.isArray(words)) {
		return json({ error: 'Words array required' }, { status: 400 });
	}

	const sessionWords = await getGtoSessionWords(params.id);

	function normalize(w: string): string {
		return w
			.toLowerCase()
			.replace(/ё/g, 'е')
			.trim();
	}

	let score = 0;
	for (let i = 0; i < sessionWords.length; i++) {
		const correct = normalize(sessionWords[i].word);
		const submitted = normalize(words[i] || '');
		if (correct === submitted) score++;
	}

	try {
		await submitWordScore(params.id, userId, score);
		return json({ success: true, score });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};
