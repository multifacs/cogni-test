import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	updateGtoSessionName,
	completeGtoSession,
	updateEditableMetrics,
	pauseGtoSession,
	resumeGtoSession,
	assignWordSet
} from '$lib/server/db/controllers/gto';

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
	const loggedInAdmin = cookies.get('logged_in_admin') === 'true';
	if (!loggedInAdmin) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const data = await request.formData();
	const action = data.get('action') as string;

	try {
		switch (action) {
			case 'rename': {
				const name = data.get('name') as string;
				if (!name) return json({ error: 'Name required' }, { status: 400 });
				await updateGtoSessionName(params.id, name);
				return json({ success: true });
			}
			case 'complete':
				await completeGtoSession(params.id);
				return json({ success: true });
			case 'pause':
				await pauseGtoSession(params.id);
				return json({ success: true });
			case 'resume':
				await resumeGtoSession(params.id);
				return json({ success: true });
			case 'assignWordSet': {
				const participantId = data.get('participantId') as string;
				const wordSetId = data.get('wordSetId') as string;
				if (!participantId || !wordSetId) {
					return json(
						{ error: 'Participant ID and word set ID required' },
						{ status: 400 }
					);
				}
				await assignWordSet(participantId, wordSetId);
				return json({ success: true });
			}
			case 'updateMetrics': {
				const participantId = data.get('participantId') as string;
				if (!participantId)
					return json({ error: 'Participant ID required' }, { status: 400 });

				const metrics: Record<string, unknown> = {};
				const balanceTest = data.get('balanceTest') as string | null;
				if (balanceTest) metrics.balanceTest = balanceTest;

				for (const field of [
					'mazeQ1',
					'mazeQ2',
					'mazeQ3',
					'mazeVRNumber',
					'buttonTestNumber',
					'logic',
					'wordSetNumber'
				]) {
					const val = data.get(field) as string | null;
					if (val !== null && val !== '') metrics[field] = parseInt(val, 10);
				}
				for (const field of ['mazeVRFileName', 'buttonTestFileName']) {
					const val = data.get(field) as string | null;
					if (val !== null) metrics[field] = val;
				}

				await updateEditableMetrics(participantId, metrics);
				return json({ success: true });
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
