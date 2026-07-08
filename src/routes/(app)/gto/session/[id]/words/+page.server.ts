import type { PageServerLoad } from './$types';
import { getGtoSessionById, getWordSetWords } from '$lib/server/db/controllers/gto';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const sessionDetail = await getGtoSessionById(params.id);
	if (!sessionDetail) error(404, 'Сессия не найдена');

	const participant = sessionDetail.participants.find((p) => p.userId === userId);
	if (!participant) error(403, 'Вы не являетесь участником этой сессии');

	if (!participant.hasCompletedTests) {
		redirect(307, `/gto/session/${params.id}/play`);
	}

	if (participant.hasSubmittedWords) {
		redirect(307, '/gto');
	}

	if (!participant.wordSetId) {
		error(400, 'Сет слов не назначен. Обратитесь к администратору.');
	}

	const words = await getWordSetWords(participant.wordSetId);
	return {
		sessionId: params.id,
		sessionName: sessionDetail.name,
		wordCount: words.length
	};
};
