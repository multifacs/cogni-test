import { MODE, DB_URL_DEV, DB_URL_PROD } from '$env/static/private';
import type { MetaResult, RegularResult, ResultInfo, TestResultMap } from '$lib/tests/types';

let DB_URL: string;
if (MODE == 'DEV') {
	DB_URL = DB_URL_DEV;
} else {
	DB_URL = DB_URL_PROD;
}

export async function postResult<T extends keyof TestResultMap>(
	results: RegularResult<T> | MetaResult<T>,
	testType: string,
	userId: string
): Promise<string> {
	console.log(JSON.stringify(results));
	try {
		const response = await fetch(`${DB_URL}/api/results/${testType}?userId=${userId}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},

			body: JSON.stringify(results)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log('Result posted:', data);
		return data;
	} catch (error) {
		console.error('Error posting result:', error);
		throw error;
	}
}

export async function getResults<T extends keyof TestResultMap>(
	testType: keyof TestResultMap,
	userId: string
): Promise<ResultInfo<T>[]> {
	try {
		const response = await fetch(`${DB_URL}/api/results/${testType}?userId=${userId}`);

		if (!response.ok) {
			// throw new Error(`HTTP error! status: ${response.status}`);
			return [];
		}

		const data = (await response.json()) as ResultInfo<T>[];
		return data;
	} catch (error) {
		console.error('Error posting result:', error);
		throw error;
	}
}
