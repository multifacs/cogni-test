import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getAuthorizedUsers,
	getGtoSessions,
	createGtoSession
} from '$lib/server/db/controllers/gto';

export const load: PageServerLoad = async () => {
	const users = await getAuthorizedUsers();
	const sessions = await getGtoSessions();
	return { users, sessions };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const participantIds = data.getAll('participantIds') as string[];
		const wordsRaw = data.get('words') as string;

		if (!name || participantIds.length === 0) {
			return fail(400, { error: 'Name and at least one participant required' });
		}

		// Parse words (comma-separated or newline-separated)
		const words = wordsRaw
			? wordsRaw
					.split(/[,\n]/)
					.map((w) => w.trim().toLowerCase())
					.filter(Boolean)
					.slice(0, 5)
			: [];

		const gtoSessionId = await createGtoSession(
			name,
			'cognitive-age',
			participantIds,
			words
		);
		return { success: true, gtoSessionId };
	}
};
