import { json } from '@sveltejs/kit';
import { getSpreadsheet } from '$lib/server/gto';
import type { RequestHandler } from './$types';
import {
	updateGtoSessionName,
	completeGtoSession,
	updateEditableMetrics,
	pauseGtoSession,
	resumeGtoSession,
	assignWordSet,
	addParticipant,
	removeParticipant,
	rescoreSubmittedWords
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
				// Auto-score if participant already submitted words
				await rescoreSubmittedWords(participantId, wordSetId);
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
					if (val !== null && val !== '') {
						const parsed = parseInt(val, 10);
						if (!isNaN(parsed)) metrics[field] = parsed;
					}
				}
				for (const field of ['mazeVRFileName', 'buttonTestFileName']) {
					const val = data.get(field) as string | null;
					if (val !== null && val !== '') metrics[field] = val;
				}

				await updateEditableMetrics(participantId, metrics);
				return json({ success: true });
			}
			case 'addParticipant': {
				const userId = data.get('userId') as string;
				if (!userId) return json({ error: 'User ID required' }, { status: 400 });
				await addParticipant(params.id, userId);
				return json({ success: true });
			}
			case 'removeParticipant': {
				const participantId = data.get('participantId') as string;
				if (!participantId)
					return json({ error: 'Participant ID required' }, { status: 400 });
				await removeParticipant(participantId);
				return json({ success: true });
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const loggedInAdmin = cookies.get('logged_in_admin') === 'true';
	if (!loggedInAdmin) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const metrics = await request.json();

	const workbook = getSpreadsheet(metrics);
	return json(workbook);
};
