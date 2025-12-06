import { db } from '$lib/server/db';
import { session, user } from '$lib/server/db/schema';
import {
	mathAttempt,
	stroopAttempt,
	memoryAttempt,
	swallowAttempt,
	munsterbergAttempt,
	campimetryAttempt,
	rhythmAttempt,
	memoryMatchAttempt
} from '$lib/server/db/models/tests';
import type { MetaResult, RegularResults, TestResultMap, TestType } from '$lib/tests/types';
import short from 'short-uuid';

export async function postResult(
	results: RegularResults | MetaResult,
	testType: TestType,
	userId: string
): Promise<string> {
	const hasMeta = 'meta' in results;
	const meta = hasMeta ? JSON.stringify(results.meta) : undefined;

	const sessionId = short.generate();

	await db.insert(session).values({
		id: sessionId,
		testType,
		userId,
		meta
	});

	const attempts = hasMeta ? results.results : results;

	const insertAttempt = {
		math: mathAttempt,
		stroop: stroopAttempt,
		memory: memoryAttempt,
		swallow: swallowAttempt,
		munsterberg: munsterbergAttempt,
		campimetry: campimetryAttempt,
		rhythm: rhythmAttempt,
		memoryMatch: memoryMatchAttempt, 
	}[testType];

	if (!insertAttempt) throw new Error(`Unknown test type: ${testType}`);


	await db.insert(insertAttempt).values(
		attempts.map((attempt) => ({
			...attempt,
			sessionId
		}))
	);

	return sessionId;
}

import type { ResultInfo } from '$lib/tests/types';
import { eq, asc, desc } from 'drizzle-orm';

export async function getResults(
	testType: TestType,
	userId: string
): Promise<ResultInfo[]> {
	const sessions = await db.query.session.findMany({
		where: (fields, { eq, and }) => and(eq(fields.testType, testType), eq(fields.userId, userId)),
		orderBy: (fields, { desc }) => desc(fields.createdAt)
	});

	const attemptTable = {
		math: db.query.mathAttempt,
		stroop: db.query.stroopAttempt,
		memory: db.query.memoryAttempt,
		swallow: db.query.swallowAttempt,
		munsterberg: db.query.munsterbergAttempt,
		campimetry: db.query.campimetryAttempt,
		rhythm: db.query.rhythmAttempt,
		memoryMatch: db.query.memoryMatchAttempt
	}[testType] as typeof db.query.campimetryAttempt;

	const results: ResultInfo[] = [];

	for (const s of sessions) {
		const attempts = await attemptTable.findMany({
			where: (fields) => eq(fields.sessionId, s.id),
			orderBy: (fields) => asc(fields.attempt)
		});

		results.push({
			sessionId: s.id,
			createdAt: s.createdAt,
            // @ts-ignore
			attempts,
			meta: s.meta ? JSON.parse(s.meta) : undefined
		});
	}

	return results;
}

export async function getLastResult<T extends keyof TestResultMap>(
	testType: T,
	userId: string
): Promise<ResultInfo | null> {
	const all = await getResults(testType, userId);
	return all[0] ?? null;
}
