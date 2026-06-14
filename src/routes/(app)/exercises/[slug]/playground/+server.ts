import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { RegularResults, MetaResult } from '$lib/tests/types.js';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const slug = params.slug;
	if (slug !== 'attention') {
		return json({ error: 'unknown exercise' }, { status: 400 });
	}
	const { results }: { results: RegularResults | MetaResult } = await request.json();
	const userId = cookies.get('user_id') as string;

	await postResult(results, 'attention', userId);
	return json('success', { status: 201 });
};
