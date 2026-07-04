import { getLastResult } from '$lib/server/db/controllers/result';
import { produce } from 'sveltekit-sse';

import type { RequestHandler } from './$types';
import type { ResultInfo, TestResultMap } from '$lib/tests/types';

async function getLastResults(sessionCreatedAt: string, tests: string[], userId: string) {
	let results: Record<string, ResultInfo> = {};

	if (!sessionCreatedAt) {
		console.error('sessionCreatedAt is null');
		return results;
	}

	if (!tests) {
		console.error('tests is null');
		return results;
	}

	if (!userId) {
		console.error('userId is null');
		return results;
	}

	for (const test of tests) {
		try {
			const res = await getLastResult(test as keyof TestResultMap, userId);

			if (!res) {
				continue;
			}

			const resCreatedAtDate = new Date(res.createdAt);
			const sessionCreatedAtDate = new Date(sessionCreatedAt);

			if (resCreatedAtDate.getTime() < sessionCreatedAtDate.getTime()) {
				continue;
			}

			results[test] = res;
		} catch (error) {
			console.error(error);
			continue;
		}
	}

	return results;
}

export const POST: RequestHandler = async ({ request }) => {
	const { sessionCreatedAt, tests, userId } = await request.json();

	const pingDelaySeconds = 5;

	return produce(async function start({ emit }) {
		let interval = setInterval(async () => {
			let results = await getLastResults(sessionCreatedAt, tests, userId);
			console.log('results from db:', results);

			const { error } = emit('message', JSON.stringify(results));
			if (error) {
				console.error('Error sending results to client:', error);
				return function cancel() {
					clearInterval(interval);
				};
			}
		}, pingDelaySeconds * 1000);

		return function cancel() {
			clearInterval(interval);
		};
	});
};
