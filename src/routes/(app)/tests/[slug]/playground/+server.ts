import { postResult } from '$lib/server/db/controllers/result.js';
import { generateDevRandomResults, UnknownDevSlugError } from '$lib/server/db/seed/generators.js';
import { json } from '@sveltejs/kit';
import { testRegistry } from '$lib/tests';
import type { MetaResult, RegularResults, TestResultMap } from '$lib/tests/types.js';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler<{
	slug: keyof TestResultMap;
}> = async ({ params, request, cookies }) => {
	const slug = params.slug as keyof TestResultMap;
	const body: {
		results?: RegularResults | MetaResult;
		action?: string;
	} = await request.json();

	if (body.action === 'generate-random') {
		const userid = cookies.get('user_id');
		if (!userid) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!testRegistry[slug]) {
			return json({ error: 'test not found' }, { status: 404 });
		}

		try {
			const results = generateDevRandomResults(slug);
			return json({ results }, { status: 200 });
		} catch (err) {
			if (err instanceof UnknownDevSlugError) {
				// slug is in testRegistry but missing from the generator map
				return json({ error: 'test not found' }, { status: 404 });
			}
			// generateDevRandomResults is fail-closed: throws when MODE !== 'DEV'
			return json({ error: 'Forbidden' }, { status: 403 });
		}
	}

	const { results }: { results: RegularResults | MetaResult } = body;
	const userid = cookies.get('user_id') as string;

	console.log(userid, 'posted', results);
	await postResult(results, slug, userid);
	return json('success', { status: 201 });
};
