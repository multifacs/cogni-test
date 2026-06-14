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
import { attentionAttempt, emojiAttempt } from '$lib/server/db/models/exercises';
import type { MetaResult as TestMetaResult, RegularResults, TestType } from '$lib/tests/types';
import type {
	ExerciseResults,
	ExerciseType,
	MetaResult as ExerciseMetaResult
} from '$lib/exercises/types';
import short from 'short-uuid';
import { eq, asc, desc } from 'drizzle-orm';

export type AnySessionType = TestType | ExerciseType;
type AnyMetaResult = TestMetaResult | ExerciseMetaResult;

const attemptTableMap: Record<string, any> = {
	math: mathAttempt,
	stroop: stroopAttempt,
	memory: memoryAttempt,
	swallow: swallowAttempt,
	munsterberg: munsterbergAttempt,
	campimetry: campimetryAttempt,
	rhythm: rhythmAttempt,
	memoryMatch: memoryMatchAttempt,
	attention: attentionAttempt,
	emoji: emojiAttempt
};

const queryTableMap: Record<string, any> = {
	math: db.query.mathAttempt,
	stroop: db.query.stroopAttempt,
	memory: db.query.memoryAttempt,
	swallow: db.query.swallowAttempt,
	munsterberg: db.query.munsterbergAttempt,
	campimetry: db.query.campimetryAttempt,
	rhythm: db.query.rhythmAttempt,
	memoryMatch: db.query.memoryMatchAttempt,
	attention: db.query.attentionAttempt,
	emoji: db.query.emojiAttempt
};

export async function postResult(
	results: RegularResults | ExerciseResults | AnyMetaResult,
	sessionType: AnySessionType,
	userId: string
): Promise<string> {
	const hasMeta = 'meta' in results;
	const meta = hasMeta ? JSON.stringify((results as AnyMetaResult).meta) : undefined;

	console.log(short, short.generate);

	const sessionId = short.generate();

	await db.insert(session).values({
		id: sessionId,
		testType: sessionType,
		userId,
		meta
	});

	const attempts = hasMeta ? results.results : results;

	const insertAttempt = attemptTableMap[sessionType];
	if (!insertAttempt) throw new Error(`Unknown session type: ${sessionType}`);

	await db.insert(insertAttempt).values(
		attempts.map((attempt: any) => ({
			...attempt,
			sessionId
		}))
	);

	return sessionId;
}

export async function getResults(sessionType: AnySessionType, userId: string): Promise<any[]> {
	const sessions = await db.query.session.findMany({
		where: (fields: any, { eq, and }: any) =>
			and(eq(fields.testType, sessionType), eq(fields.userId, userId)),
		orderBy: (fields: any, { desc }: any) => desc(fields.createdAt)
	});

	const attemptTable = queryTableMap[sessionType];
	if (!attemptTable) throw new Error(`Unknown session type: ${sessionType}`);

	const results: any[] = [];

	for (const s of sessions) {
		const attempts = await attemptTable.findMany({
			where: (fields: any) => eq(fields.sessionId, s.id),
			orderBy: (fields: any) => asc(fields.attempt)
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

export async function getLastResult(
	sessionType: AnySessionType,
	userId: string
): Promise<any | null> {
	const all = await getResults(sessionType, userId);
	return all[0] ?? null;
}
