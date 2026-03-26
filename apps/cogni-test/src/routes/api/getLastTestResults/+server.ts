import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { getLastResult } from '$lib/server/db/controllers/result';
import type { ResultInfo } from '$lib/tests/types';

export const POST: RequestHandler = async ({ request }) => {
	const { sessionCreatedAt, tests, userId } = await request.json();
	if (!sessionCreatedAt) {
		return json({ error: 'Session created at is required' }, { status: 400 });
	}

	if (!tests) {
		return json({ error: 'Tests is required' }, { status: 400 });
	}

	if (!userId) {
		return json({ error: 'UserId is required' }, { status: 400 });
	}

	let results: Record<string, ResultInfo<any>> = {};

	for (const test of tests) {
		try {
			const res = await getLastResult(test, userId);

			if (!res) {
				console.log(`No results for ${test}`);
				continue;
			}

			const resCreatedAtDate = new Date(res.createdAt);
			const sessionCreatedAtDate = new Date(sessionCreatedAt);

			if (resCreatedAtDate.getTime() < sessionCreatedAtDate.getTime()) {
				console.log(`Results for ${test} is too old`);
				continue;
			}

			results[test] = res;
		} catch (error) {
			console.error(error);
			continue;
		}
	}

	return json({ success: true, results });
};
