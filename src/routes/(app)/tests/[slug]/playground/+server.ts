import { postResult, SessionOwnershipError } from '$lib/server/db/controllers/result.js';
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
		sessionId?: string;
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

	if (!body.results) {
		return json({ error: 'results are required' }, { status: 400 });
	}
	const { sessionId } = body;
	const userid = cookies.get('user_id') as string;

	console.log(userid, 'posted', body.results);
	// postResult returns the sessionId for both a fresh insert and an
	// already-existing session (unique-constraint path) — the client can
	// safely retry with the same id.
	try {
		const storedSessionId = await postResult(body.results, slug, userid, sessionId);
		return json({ sessionId: storedSessionId }, { status: 201 });
	} catch (err) {
		if (err instanceof SessionOwnershipError) {
			return json({ error: 'session belongs to another user' }, { status: 409 });
		}
		throw err;
	}
};
