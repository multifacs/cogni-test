import type { PageServerLoad } from './$types';
import { getActiveGtoSessionsForUser, getGtoSessionWords } from '$lib/server/db/controllers/gto';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const activeSessions = await getActiveGtoSessionsForUser(userId);

	const sessionsWithWords = await Promise.all(
		activeSessions.map(async (s) => ({
			...s,
			words: await getGtoSessionWords(s.gtoSessionId)
		}))
	);

	return { activeSessions: sessionsWithWords, userId };
};
