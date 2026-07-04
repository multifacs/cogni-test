import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	updateGtoSessionName,
	completeGtoSession,
	updateEditableMetrics
} from '$lib/server/db/controllers/gto';

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
	const loggedInAdmin = cookies.get('logged_in_admin') === 'true';
	if (!loggedInAdmin) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const body = await request.json();
	const { action, ...payload } = body;

	switch (action) {
		case 'rename':
			await updateGtoSessionName(params.id, payload.name);
			return json({ success: true });
		case 'complete':
			await completeGtoSession(params.id);
			return json({ success: true });
		case 'updateMetrics':
			await updateEditableMetrics(payload.participantId, payload.metrics);
			return json({ success: true });
		default:
			return json({ error: 'Unknown action' }, { status: 400 });
	}
};
