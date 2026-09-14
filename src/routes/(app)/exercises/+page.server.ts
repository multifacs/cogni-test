import { exercises } from '$lib/exercises';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import type { PageServerLoad } from './$types';
import { exerciseToSessionType } from './session-types';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	let predictedAge = null;
	const exerciseSessionCounts: Record<string, number> = {};
	if (!userId) return { exercises };

	const features = await getFeaturesFromDB(userId);
	if (features) {
		// отсекаем метрики без данных — модель ждёт только числа
		const cleanFeatures = Object.fromEntries(
			Object.entries(features).filter(([, v]) => v !== null)
		) as Record<string, number>;
		predictedAge = await runAgeModel(cleanFeatures);
	}

	const rawCounts = await getTestSessionCounts(userId);
	for (const ex of exercises) {
		const sessionType = exerciseToSessionType[ex.name];
		if (sessionType && rawCounts[sessionType]) {
			exerciseSessionCounts[ex.name] = rawCounts[sessionType];
		}
	}

	return {
		exercises,
		userId,
		predictedAge,
		exerciseSessionCounts
	};
};
