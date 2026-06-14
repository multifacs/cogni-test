import { getResults } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const slug = params.slug;
	if (slug !== 'attention') {
		return json({ results: [] });
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults('attention', userId);
	return json({ results });
};
