import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const slug = params.slug;
	console.log(slug);

	try {
		await import(`$lib/exercises/${slug}/Playground.svelte`);
	} catch (err) {
		console.log(err);
		error(404, 'test not found');
	}

	const data = {};
	return data;
}
