import { error } from '@sveltejs/kit';
import { testRegistry } from '$lib/tests';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	const test = testRegistry[slug];

	if (!test) {
		error(404, 'test not found');
	}

	try {
		await test.about();
	} catch {
		error(404, 'test not found');
	}
};
