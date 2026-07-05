import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { profileSurvey } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import {
	getGtoSessionById,
	getGtoSessionMetrics,
	getWordSets,
	updateGtoSessionName,
	completeGtoSession,
	updateEditableMetrics,
	pauseGtoSession,
	resumeGtoSession,
	assignWordSet
} from '$lib/server/db/controllers/gto';

export const load: PageServerLoad = async ({ params }) => {
	const sessionDetail = await getGtoSessionById(params.id);
	if (!sessionDetail) {
		error(404, 'Сессия не найдена');
	}
	const metrics = await getGtoSessionMetrics(params.id);
	const wordSets = await getWordSets();

	const userIds = sessionDetail.participants.map((p) => p.userId);
	const surveys = userIds.length
		? await db
				.select({ userId: profileSurvey.userId, gtoId: profileSurvey.gtoId })
				.from(profileSurvey)
				.where(inArray(profileSurvey.userId, userIds))
		: [];
	const gtoIdMap = new Map(surveys.map((s) => [s.userId, s.gtoId]));
	const wordSetIdMap = new Map(
		sessionDetail.participants.map((p) => [p.id, p.wordSetId])
	);

	return {
		session: sessionDetail,
		metrics,
		wordSets,
		gtoIdMap,
		wordSetIdMap
	};
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
	pause: async ({ params }) => {
		await pauseGtoSession(params.id);
		return { success: true };
	},
	resume: async ({ params }) => {
		await resumeGtoSession(params.id);
		return { success: true };
	},
	assignWordSet: async ({ request }) => {
		const data = await request.formData();
		const participantId = data.get('participantId') as string;
		const wordSetId = data.get('wordSetId') as string;
		if (!participantId || !wordSetId) {
			return fail(400, { error: 'Participant ID and word set ID required' });
		}
		await assignWordSet(participantId, wordSetId);
		return { success: true };
	},
	updateMetrics: async ({ request }) => {
		const data = await request.formData();
		const participantId = data.get('participantId') as string;
		if (!participantId) return fail(400, { error: 'Participant ID required' });

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
