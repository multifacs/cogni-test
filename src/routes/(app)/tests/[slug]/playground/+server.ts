import { postResult } from '$lib/server/db/controllers/result.js';
import type { MetaResult, RegularResult, TestResultMap } from '$lib/tests/types.js';
import { json } from '@sveltejs/kit';

export async function POST<T extends keyof TestResultMap>({ params, request, cookies }) {
	const slug = params.slug as keyof TestResultMap;
	const { results }: { results: RegularResult<T> | MetaResult<T> } = await request.json();
	const userid = cookies.get('user_id') as string;

	console.log(userid, 'posted', results);
	await postResult(results, slug, userid);
	return json('success', { status: 201 });
}
