import { json } from '@sveltejs/kit';
import { createGtoSession } from '$lib/server/db/controllers/gto-m';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { profile, userId, adminId } = await request.json();
	if (!adminId) {
		return json({ error: 'AdminId is required' }, { status: 400 });
	}

	// TODO: leave this for now, later need to handle request for creating multi user sessions
	if (!userId) {
		return json({ error: 'UserId is required' }, { status: 400 });
	}

    const sessionId = await createGtoSession(userId, adminId, profile);

    if (!sessionId) {
        return json({ error: 'Failed to create session' }, { status: 500 });
    }

	return json({ success: true, sessionId });
};
