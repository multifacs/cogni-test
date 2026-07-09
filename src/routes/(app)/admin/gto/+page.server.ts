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

		if (!name || participantIds.length === 0) {
			return fail(400, { error: 'Name and at least one participant required' });
		}

		const gtoSessionId = await createGtoSession(name, 'cognitive-age', participantIds);
		return { success: true, gtoSessionId };
	}
};
