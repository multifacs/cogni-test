import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	submitWordScore,
	getGtoSessionById,
	getWordSetWords
} from '$lib/server/db/controllers/gto';

export const POST: RequestHandler = async ({ request, params, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	// Verify user is a participant of this session
	const sessionDetail = await getGtoSessionById(params.id);
	const participant = sessionDetail.participants.find((p) => p.userId === userId);
	if (!participant) {
		return json({ error: 'You are not a participant of this session' }, { status: 403 });
	}

	const body = await request.json();
	const { words } = body;
	if (!words || !Array.isArray(words)) {
		return json({ error: 'Words array required' }, { status: 400 });
	}

	if (!participant.wordSetId) {
		return json({ error: 'No word set assigned' }, { status: 400 });
	}

	const sessionWords = await getWordSetWords(participant.wordSetId);

	function normalize(w: string): string {
		return w.toLowerCase().replace(/ё/g, 'е').trim();
	}

	let score = 0;
	for (let i = 0; i < sessionWords.length; i++) {
		const correct = normalize(sessionWords[i]);
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
