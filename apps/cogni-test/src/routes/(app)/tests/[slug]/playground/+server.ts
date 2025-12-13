import { postResult } from '$lib/server/db/controllers/result.js';
import { json } from '@sveltejs/kit';
import type { MetaResult, RegularResults, TestResultMap } from '$lib/tests/types.js';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler<{
	slug: keyof TestResultMap;
}> = async ({ params, request, cookies }) => {
	const slug = params.slug as keyof TestResultMap;
	const { results }: { results: RegularResults | MetaResult } =
		await request.json();
	const userid = cookies.get('user_id') as string;

	console.log(userid, 'posted', results);
	await postResult(results, slug, userid);
	return json('success', { status: 201 });
};
