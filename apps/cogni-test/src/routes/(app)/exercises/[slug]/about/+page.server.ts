import { error } from '@sveltejs/kit';
import { exerciseRegistry } from '$lib/exercises';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	const exercise = exerciseRegistry[slug];

	if (!exercise) {
		error(404, 'test not found');
	}

	try {
		await exercise.about();
	} catch {
		error(404, 'test not found');
	}
};
