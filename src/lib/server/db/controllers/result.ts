import { db } from '$lib/server/db';
import { session, user } from '$lib/server/db/schema';
import {
	mathAttempt,
	stroopAttempt,
	memoryAttempt,
	swallowAttempt,
	munsterbergAttempt,
	campimetryAttempt
} from '$lib/server/db/models/tests';
import {
	attentionAttempt,
	campimetryExerciseAttempt,
	emojiAttempt,
	flankerAttempt,
	lettersAttempt,
	memoryMatchExerciseAttempt,
	nbackExerciseAttempt,
	numbersAttempt,
	picturesAttempt,
	ravenAttempt,
	wordMorphingExerciseAttempt
} from '$lib/server/db/models/exercises';
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
	attention: attentionAttempt,
	emoji: emojiAttempt,
	flanker: flankerAttempt,
	letters: lettersAttempt,
	memoryMatchExercise: memoryMatchExerciseAttempt,
	nbackExercise: nbackExerciseAttempt,
	numbers: numbersAttempt,
	pictures: picturesAttempt,
	campimetryExercise: campimetryExerciseAttempt,
	ravenMatrices: ravenAttempt,
	wordMorphingExercise: wordMorphingExerciseAttempt
};

const queryTableMap: Record<string, any> = {
	math: db.query.mathAttempt,
	stroop: db.query.stroopAttempt,
	memory: db.query.memoryAttempt,
	swallow: db.query.swallowAttempt,
	munsterberg: db.query.munsterbergAttempt,
	campimetry: db.query.campimetryAttempt,
	attention: db.query.attentionAttempt,
	emoji: db.query.emojiAttempt,
	flanker: db.query.flankerAttempt,
	letters: db.query.lettersAttempt,
	memoryMatchExercise: db.query.memoryMatchExerciseAttempt,
	nbackExercise: db.query.nbackExerciseAttempt,
	numbers: db.query.numbersAttempt,
	pictures: db.query.picturesAttempt,
	ravenMatrices: db.query.ravenAttempt,
	campimetryExercise: db.query.campimetryExerciseAttempt,
	wordMorphingExercise: db.query.wordMorphingExerciseAttempt
};

const orderByMap: Record<string, (fields: any) => any> = {
	math: (f) => asc(f.attempt),
	stroop: (f) => asc(f.attempt),
	memory: (f) => asc(f.attempt),
	swallow: (f) => asc(f.attempt),
	munsterberg: (f) => asc(f.attempt),
	campimetry: (f) => asc(f.attempt),
	attention: (f) => asc(f.clickIndex),
	emoji: (f) => asc(f.trialIndex),
	flanker: (f) => asc(f.trialIndex),
	letters: (f) => asc(f.roundIndex),
	memoryMatchExercise: (f) => asc(f.attempt),
	nbackExercise: (f) => asc(f.attempt),
	numbers: (f) => asc(f.levelIndex),
	pictures: (f) => asc(f.questionIndex),
	campimetryExercise: (f) => asc(f.attempt),
	ravenMatrices: (f) => asc(f.taskIndex),
	wordMorphingExercise: (f) => asc(f.comboIndex)
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

	const orderBy = orderByMap[sessionType];
	if (!orderBy) throw new Error(`Unknown session type: ${sessionType}`);

	const results: any[] = [];

	for (const s of sessions) {
		const attempts = await attemptTable.findMany({
			where: (fields: any) => eq(fields.sessionId, s.id),
			orderBy
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
