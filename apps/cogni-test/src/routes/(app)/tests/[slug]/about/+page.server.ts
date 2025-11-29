import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;

	try {
		await import(`$lib/tests/${slug}/About.svelte`);
	} catch {
		error(404, 'test not found');
	}
}
