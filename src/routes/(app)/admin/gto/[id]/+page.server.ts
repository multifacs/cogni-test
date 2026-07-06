import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { profileSurvey } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import {
	getGtoSessionById,
	getGtoSessionMetrics,
	getWordSets
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
