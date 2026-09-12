import type { PageServerLoad, Actions } from './$types';
import {
	getActiveGtoSessionsForUser,
	getCompletedGtoSessionsForUser,
	setGtoIdAndAutoAdd
} from '$lib/server/db/controllers/gto';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const [activeSessions, completedSessions] = await Promise.all([
		getActiveGtoSessionsForUser(userId),
		getCompletedGtoSessionsForUser(userId)
	]);
	return { activeSessions, completedSessions, userId };
};

export const actions = {
	saveGtoId: async ({ cookies, request }) => {
		const userId = cookies.get('user_id');
		if (!userId) redirect(307, '/');

		const formData = await request.formData();
		const gtoId = (formData.get('gtoId') as string | null)?.trim() ?? '';

		if (!gtoId) {
			return fail(400, { error: 'Введите ваш ГТО-М ID' });
		}

		await setGtoIdAndAutoAdd(userId, gtoId);
	}
} satisfies Actions;
