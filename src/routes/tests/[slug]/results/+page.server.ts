import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const slug = params.slug;

	try {
		await import(`$lib/tests/${slug}/Results.svelte`);
	} catch {
		error(404, 'test not found');
	}
}
