import { error } from '@sveltejs/kit';
import { exerciseRegistry } from '$lib/exercises';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	const exercise = exerciseRegistry[slug];

	if (!exercise?.hasPlayground || !exercise.playground) {
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
};
