import { getResults } from '$lib/server/db/controllers/result.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug;
	if (slug !== 'attention') {
		return { results: [] };
	}
	const userId = cookies.get('user_id') as string;
	const results = await getResults('attention', userId);
	return { results };
};
