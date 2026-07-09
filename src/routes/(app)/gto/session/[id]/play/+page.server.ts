import type { PageServerLoad } from './$types';
import { getGtoSessionById } from '$lib/server/db/controllers/gto';
import { error, redirect } from '@sveltejs/kit';
import { GTO_TEST_ORDER, gtoTestAboutUrl } from '$lib/tests';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const sessionDetail = await getGtoSessionById(params.id);
	if (!sessionDetail) error(404, 'Сессия не найдена');

	if (sessionDetail.status === 'paused') {
		redirect(307, '/gto');
	}

	const participant = sessionDetail.participants.find((p) => p.userId === userId);
	if (!participant) error(403, 'Вы не являетесь участником этой сессии');

	if (participant.hasCompletedTests) {
		if (!participant.hasSubmittedWords) {
			redirect(307, `/gto/session/${params.id}/words`);
		}
		redirect(307, '/gto');
	}

	const currentTestType =
		GTO_TEST_ORDER[participant.currentTestIndex]?.type ?? GTO_TEST_ORDER[0].type;

	// Redirect to the test/exercise about page with gtoSessionId param
	redirect(307, gtoTestAboutUrl(currentTestType, participant.currentTestIndex, params.id));
};
