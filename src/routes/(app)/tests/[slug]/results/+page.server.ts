import { getResults } from '$lib/server/db/result.js';
import type { TestResultMap } from '$lib/tests/types';
// import { error } from '@sveltejs/kit';

export async function load({ params, cookies }) {
	const slug = params.slug as keyof TestResultMap;
	console.log(slug);
	const userId = cookies.get('user_id') as string;

	const results = await getResults(slug, userId);
	console.log('results: ', results);

	// try {
	// 	await import(`$lib/tests/${slug}/Results.svelte`);
	// } catch {
	// 	error(404, 'test not found');
	// }

	return { results };
}
