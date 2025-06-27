import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const slug = params.slug;

	try {
		await import(`$lib/exercises/${slug}/About.svelte`);
	} catch {
		error(404, 'test not found');
	}
}
