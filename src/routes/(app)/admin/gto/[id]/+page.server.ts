import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	getGtoSessionById,
	getGtoSessionMetrics,
	updateGtoSessionName,
	completeGtoSession,
	updateEditableMetrics
} from '$lib/server/db/controllers/gto';

export const load: PageServerLoad = async ({ params }) => {
	const sessionDetail = await getGtoSessionById(params.id);
	if (!sessionDetail) {
		error(404, 'Сессия не найдена');
	}
	const metrics = await getGtoSessionMetrics(params.id);
	return { session: sessionDetail, metrics };
};

export const actions: Actions = {
	rename: async ({ request, params }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		if (!name) return fail(400, { error: 'Name required' });
		await updateGtoSessionName(params.id, name);
		return { success: true };
	},
	complete: async ({ params }) => {
		await completeGtoSession(params.id);
		return { success: true };
	},
	updateMetrics: async ({ request }) => {
		const data = await request.formData();
		const participantId = data.get('participantId') as string;
		if (!participantId) return fail(400, { error: 'Participant ID required' });

		const metrics: Record<string, unknown> = {};
		const balanceTest = data.get('balanceTest') as string | null;
		if (balanceTest) metrics.balanceTest = balanceTest;

		for (const field of ['mazeQ1', 'mazeQ2', 'mazeQ3', 'mazeVRNumber', 'buttonTestNumber']) {
			const val = data.get(field) as string | null;
			if (val !== null && val !== '') metrics[field] = parseInt(val);
		}
		for (const field of ['mazeVRFileName', 'buttonTestFileName']) {
			const val = data.get(field) as string | null;
			if (val !== null) metrics[field] = val;
		}

		await updateEditableMetrics(participantId, metrics);
		return { success: true };
	}
};
