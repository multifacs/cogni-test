import { error } from '@sveltejs/kit';
import { exerciseRegistry } from '$lib/exercises';
import { getSessionList } from '$lib/server/db/controllers/result';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	const exercise = exerciseRegistry[slug];

	if (!exercise?.playground) {
		error(404, 'test not found');
	}

	try {
		await exercise.playground();
	} catch {
		error(404, 'test not found');
	}

	if (slug.includes('campimetry')) {
		const silhouettes = {
			bird: '/campimetry/bird.svg',
			butterfly: '/campimetry/butterfly.svg',
			cat: '/campimetry/cat.svg',
			dog: '/campimetry/dog.svg',
			shark: '/campimetry/shark.svg'
		};

		return { silhouettes };
	}

	if (slug === 'rhythm') {
		const userId = cookies.get('user_id');
		const counts = { easy: 0, medium: 0, hard: 0 };

		if (userId) {
			const sessions = await getSessionList('rhythm', userId);
			for (const s of sessions) {
				if (!s.meta) continue;
				try {
					const meta = JSON.parse(s.meta) as Record<string, unknown>;
					const d = meta.difficulty;
					if (d === 'easy' || d === 'medium' || d === 'hard') {
						counts[d]++;
					}
				} catch {
					// ignore malformed meta
				}
			}
		}

		return { difficultyCounts: counts };
	}
};
