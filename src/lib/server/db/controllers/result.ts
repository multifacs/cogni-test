import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
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
	rhythmAttempt,
	wordMorphingExerciseAttempt
} from '$lib/server/db/models/exercises';
import type { MetaResult as TestMetaResult, RegularResults, TestType } from '$lib/tests/types';
import type {
	ExerciseResults,
	ExerciseType,
	MetaResult as ExerciseMetaResult
} from '$lib/exercises/types';

import { generate } from 'short-uuid';

import { eq, asc, type AnyColumn, type SQL } from 'drizzle-orm';
import type { SessionResult } from '$lib/shared/metrics';

export type AnySessionType = TestType | ExerciseType;
type AnyMetaResult = TestMetaResult | ExerciseMetaResult;

// Реестр из 17 гетерогенных drizzle-таблиц: дженерики PgTableWithColumns
// не сводятся к одному типу, а union ломает перегрузки db.insert/.findMany.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyAttemptTable = any;
type AnyRelationalTable = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const attemptTableMap: Record<string, AnyAttemptTable> = {
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
	wordMorphingExercise: wordMorphingExerciseAttempt,
	rhythm: rhythmAttempt
};

function getQueryTableMap(): Record<string, AnyRelationalTable> {
	return {
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
		wordMorphingExercise: db.query.wordMorphingExerciseAttempt,
		rhythm: db.query.rhythmAttempt
	};
}

const orderByMap: Record<string, (fields: Record<string, AnyColumn>) => SQL> = {
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
	nbackExercise: (f) => asc(f.clickIndex),
	numbers: (f) => asc(f.levelIndex),
	pictures: (f) => asc(f.questionIndex),
	campimetryExercise: (f) => asc(f.attempt),
	ravenMatrices: (f) => asc(f.taskIndex),
	wordMorphingExercise: (f) => asc(f.comboIndex),
	rhythm: (f) => asc(f.attempt)
};

function isUniqueConstraintError(err: unknown): boolean {
	let current: unknown = err;
	while (current) {
		const candidate = current as { code?: unknown; cause?: unknown };
		if (candidate && typeof candidate === 'object' && candidate.code === 'UNIQUE_CONSTRAINT') return true;
		const msg = current instanceof Error ? current.message : String(current);
		if (msg.includes('UNIQUE constraint failed')) return true;
		current = candidate?.cause;
	}
	return false;
}

async function insertAttempts(
	sessionId: string,
	sessionType: AnySessionType,
	attempts: any[]
): Promise<void> {
	const insertAttempt = attemptTableMap[sessionType];
	if (!insertAttempt) throw new Error(`Unknown session type: ${sessionType}`);
	await db.insert(insertAttempt).values(
		attempts.map((attempt) => ({
			...attempt,
			sessionId
		}))
	);
}

export async function postResult(
	results: RegularResults | ExerciseResults | AnyMetaResult,
	sessionType: AnySessionType,
	userId: string,
	providedSessionId?: string
): Promise<string> {
	const hasMeta = 'meta' in results;
	const meta = hasMeta ? JSON.stringify((results as AnyMetaResult).meta) : undefined;

	const sessionId = providedSessionId ?? generate();

	try {
		await db.insert(session).values({
			id: sessionId,
			testType: sessionType,
			userId,
			meta
		});
	} catch (err) {
		if (isUniqueConstraintError(err)) {
			const existing = await db.query.session.findFirst({
				where: (fields, { eq }) => eq(fields.id, sessionId)
			});
			if (existing && existing.userId !== userId) {
				throw new Error(`Session ${sessionId} belongs to a different user`);
			}
			if (existing) {
				const queryTableMap = getQueryTableMap();
				const attemptTable = queryTableMap[sessionType];
				if (!attemptTable) throw new Error(`Unknown session type: ${sessionType}`);
				const existingAttempts = await attemptTable.findMany({
					where: (fields: Record<string, AnyColumn>) => eq(fields.sessionId, sessionId)
				});
				if (existingAttempts.length > 0) {
					return sessionId;
				}
				// half-crash: session row inserted, attempts weren't → backfill
				const attempts = hasMeta ? results.results : results;
				await insertAttempts(sessionId, sessionType, attempts);
				return sessionId;
			}
		}
		throw err;
	}

	const attempts = hasMeta ? results.results : results;
	await insertAttempts(sessionId, sessionType, attempts);
	return sessionId;
}

export async function getSessionList(
	testType: AnySessionType,
	userId: string
): Promise<{ id: string; meta: string | null; createdAt: string }[]> {
	return db.query.session.findMany({
		columns: { id: true, meta: true, createdAt: true },
		where: (fields, { eq, and }) => and(eq(fields.testType, testType), eq(fields.userId, userId)),
		orderBy: (fields, { desc }) => desc(fields.createdAt)
	});
}

export async function getResults(
	sessionType: AnySessionType,
	userId: string
): Promise<SessionResult[]> {
	const sessions = await db.query.session.findMany({
		where: (fields, { eq, and }) =>
			and(eq(fields.testType, sessionType), eq(fields.userId, userId)),
		orderBy: (fields, { desc }) => desc(fields.createdAt)
	});

	const queryTableMap = getQueryTableMap();
	const attemptTable = queryTableMap[sessionType];
	if (!attemptTable) throw new Error(`Unknown session type: ${sessionType}`);

	const orderBy = orderByMap[sessionType];
	if (!orderBy) throw new Error(`Unknown session type: ${sessionType}`);

	const results = [];

	for (const s of sessions) {
		const attempts = await attemptTable.findMany({
			where: (fields: Record<string, AnyColumn>) => eq(fields.sessionId, s.id),
			orderBy
		});

		results.push({
			sessionId: s.id,
			createdAt: s.createdAt,
			attempts,
			meta: s.meta ? JSON.parse(s.meta) : undefined
		});
	}

	return results;
}

export async function getLastResult(
	sessionType: AnySessionType,
	userId: string
): Promise<SessionResult | null> {
	const all = await getResults(sessionType, userId);
	return all[0] ?? null;
}
