import type { PageServerLoad } from './$types';
import { getGtoSessionById, getGtoSessionMetrics } from '$lib/server/db/controllers/gto';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const sessionDetail = await getGtoSessionById(params.id);
	if (!sessionDetail) error(404, 'Сессия не найдена');

	const participant = sessionDetail.participants.find((p) => p.userId === userId);
	if (!participant) error(403, 'Вы не являетесь участником этой сессии');

	const allMetrics = await getGtoSessionMetrics(params.id);
	const userMetrics = allMetrics.find((m) => m.userId === userId);
	if (!userMetrics) error(404, 'Метрики не найдены');

	return {
		session: sessionDetail,
		metrics: userMetrics
	};
};
