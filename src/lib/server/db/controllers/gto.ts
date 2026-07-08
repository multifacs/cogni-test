import { db } from '$lib/server/db';
import { session, user, profileSurvey } from '$lib/server/db/schema';
import {
	gtoSession,
	gtoSessionParticipant,
	gtoEditableMetric,
	gtoWordSet
} from '$lib/server/db/models/gto';
import {
	stroopAttempt,
	mathAttempt,
	munsterbergAttempt,
	campimetryAttempt,
	memoryAttempt,
	swallowAttempt
} from '$lib/server/db/models/tests';
import { ravenAttempt } from '$lib/server/db/models/exercises';
import { TASK_CLASS_LABELS } from '$lib/exercises/raven-matrices/results-adapter';
import type { TaskClass } from '$lib/exercises/raven-matrices/types';
import { generate } from 'short-uuid';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { missingFieldLabels } from '$lib/survey-field-labels';

export { missingFieldLabels as computeMissingSurveyFieldLabels };

// ─── Survey field list (mirrors user.ts) ────────────────────────────

const SURVEY_FIELDS = [
	'birthCity',
	'currentCityType',
	'education',
	'yearsNotQualified',
	'yearsQualifiedApplied',
	'yearsQualifiedNonApplied',
	'yearsProfessional',
	'yearsHighResponsibility',
	'currentOccupation',
	'jobPosition',
	'weeklyReading',
	'weeklyHousework',
	'weeklyHobby',
	'weeklyTech',
	'monthlySocial',
	'monthlyCulture',
	'monthlyGardening',
	'monthlyCaring',
	'monthlyVolunteer',
	'monthlyArtistic',
	'yearlyEvents',
	'yearlyTravel',
	'yearlyBookReading',
	'height',
	'weight',
	'dominantHand',
	'isAmbidextrous',
	'chronicDiseases',
	'smoking',
	'alcohol',
	'sports',
	'isGamer',
	'gtoId',
	'email'
] as const;

function mean(arr: number[]): number | null {
	if (arr.length === 0) return null;
	return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function stdDev(arr: number[]): number | null {
	if (arr.length < 2) return null;
	const avg = mean(arr)!;
	const variance = arr.reduce((sum, v) => sum + (v - avg) ** 2, 0) / arr.length;
	return Math.sqrt(variance);
}

function accuracy(correct: boolean[], total: number): number {
	if (total === 0) return 0;
	return correct.filter(Boolean).length / total;
}

function calculateAge(birthday: Date): number {
	const today = new Date();
	let age = today.getFullYear() - birthday.getFullYear();
	const m = today.getMonth() - birthday.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age--;
	return age;
}

function computeMissingSurveyFields(survey: Record<string, unknown> | null): string[] {
	if (!survey) return [...SURVEY_FIELDS];
	const missing: string[] = [];
	for (const field of SURVEY_FIELDS) {
		if (survey[field] === null || survey[field] === undefined) {
			missing.push(field);
		}
	}
	return missing;
}

// ─── 1. createGtoSession ────────────────────────────────────────────

export async function createGtoSession(
	name: string,
	type: string,
	participantIds: string[]
): Promise<string> {
	return await db.transaction(async (tx) => {
		const gtoSessionId = generate();

		await tx.insert(gtoSession).values({
			id: gtoSessionId,
			name,
			type
		});

		if (participantIds.length > 0) {
			const participantRows = participantIds.map((userId) => ({
				id: generate(),
				gtoSessionId,
				userId,
				hasCompletedTests: false,
				hasSubmittedWords: false
			}));
			await tx.insert(gtoSessionParticipant).values(participantRows);

			await tx.insert(gtoEditableMetric).values(
				participantRows.map((p) => ({
					id: generate(),
					participantId: p.id
				}))
			);
		}

		return gtoSessionId;
	});
}

// ─── 2. getGtoSessions ─────────────────────────────────────────────

export type GtoSessionListItem = {
	id: string;
	name: string;
	type: string;
	status: string;
	createdAt: string;
	participantCount: number;
};

export async function getGtoSessions(): Promise<GtoSessionListItem[]> {
	const sessions = await db.select().from(gtoSession).orderBy(desc(gtoSession.createdAt));

	const counts = await db
		.select({
			gtoSessionId: gtoSessionParticipant.gtoSessionId,
			count: sql<number>`count(*)`.as('count')
		})
		.from(gtoSessionParticipant)
		.groupBy(gtoSessionParticipant.gtoSessionId);

	const countMap = new Map(counts.map((c) => [c.gtoSessionId, c.count]));

	return sessions.map((s) => ({
		id: s.id,
		name: s.name,
		type: s.type,
		status: s.status,
		createdAt: s.createdAt,
		participantCount: countMap.get(s.id) ?? 0
	}));
}

// ─── 3. getGtoSessionById ──────────────────────────────────────────

export type GtoSessionDetail = {
	id: string;
	name: string;
	type: string;
	status: string;
	createdAt: string;
	participants: GtoSessionParticipantDetail[];
};

export type GtoSessionParticipantDetail = {
	id: string;
	userId: string;
	firstname: string;
	lastname: string;
	birthday: Date;
	sex: 'male' | 'female';
	hasCompletedTests: boolean;
	hasSubmittedWords: boolean;
	currentTestIndex: number;
	wordScore: number | null;
	submittedWords: string[] | null;
	wordSetId: string | null;
	editableMetrics: GtoEditableMetricDetail;
};

export type GtoEditableMetricDetail = {
	id: string | null;
	balanceTest: string | null;
	mazeQ1: number | null;
	mazeQ2: number | null;
	mazeQ3: number | null;
	mazeVRNumber: number | null;
	mazeVRFileName: string | null;
	buttonTestNumber: number | null;
	buttonTestFileName: string | null;
	logic: number | null;
	wordSetNumber: number | null;
};

export async function getGtoSessionById(id: string): Promise<GtoSessionDetail> {
	const [gtoSessionRow] = await db.select().from(gtoSession).where(eq(gtoSession.id, id));

	if (!gtoSessionRow) {
		throw new Error(`GTO session not found: ${id}`);
	}

	// Participants + user info + editable metrics
	const participantRows = await db
		.select({
			participantId: gtoSessionParticipant.id,
			userId: gtoSessionParticipant.userId,
			hasCompletedTests: gtoSessionParticipant.hasCompletedTests,
			hasSubmittedWords: gtoSessionParticipant.hasSubmittedWords,
			currentTestIndex: gtoSessionParticipant.currentTestIndex,
			wordScore: gtoSessionParticipant.wordScore,
			submittedWords: gtoSessionParticipant.submittedWords,
			wordSetId: gtoSessionParticipant.wordSetId,
			firstname: user.firstname,
			lastname: user.lastname,
			birthday: user.birthday,
			sex: user.sex,
			metricId: gtoEditableMetric.id,
			balanceTest: gtoEditableMetric.balanceTest,
			mazeQ1: gtoEditableMetric.mazeQ1,
			mazeQ2: gtoEditableMetric.mazeQ2,
			mazeQ3: gtoEditableMetric.mazeQ3,
			mazeVRNumber: gtoEditableMetric.mazeVRNumber,
			mazeVRFileName: gtoEditableMetric.mazeVRFileName,
			buttonTestNumber: gtoEditableMetric.buttonTestNumber,
			buttonTestFileName: gtoEditableMetric.buttonTestFileName,
			logic: gtoEditableMetric.logic,
			wordSetNumber: gtoEditableMetric.wordSetNumber
		})
		.from(gtoSessionParticipant)
		.innerJoin(user, eq(user.id, gtoSessionParticipant.userId))
		.leftJoin(gtoEditableMetric, eq(gtoEditableMetric.participantId, gtoSessionParticipant.id))
		.where(eq(gtoSessionParticipant.gtoSessionId, id));

	const participants: GtoSessionParticipantDetail[] = participantRows.map((row) => ({
		id: row.participantId,
		userId: row.userId,
		firstname: row.firstname,
		lastname: row.lastname,
		birthday: row.birthday,
		sex: row.sex,
		hasCompletedTests: row.hasCompletedTests,
		hasSubmittedWords: row.hasSubmittedWords,
		currentTestIndex: row.currentTestIndex,
		wordScore: row.wordScore,
		submittedWords: row.submittedWords ? JSON.parse(row.submittedWords) : null,
		wordSetId: row.wordSetId,
		editableMetrics: {
			id: row.metricId,
			balanceTest: row.balanceTest,
			mazeQ1: row.mazeQ1,
			mazeQ2: row.mazeQ2,
			mazeQ3: row.mazeQ3,
			mazeVRNumber: row.mazeVRNumber,
			mazeVRFileName: row.mazeVRFileName,
			buttonTestNumber: row.buttonTestNumber,
			buttonTestFileName: row.buttonTestFileName,
			logic: row.logic,
			wordSetNumber: row.wordSetNumber
		}
	}));

	// Words
	return {
		id: gtoSessionRow.id,
		name: gtoSessionRow.name,
		type: gtoSessionRow.type,
		status: gtoSessionRow.status,
		createdAt: gtoSessionRow.createdAt,
		participants
	};
}

// ─── 4. updateGtoSessionName ───────────────────────────────────────

export async function updateGtoSessionName(id: string, name: string): Promise<void> {
	const result = await db.update(gtoSession).set({ name }).where(eq(gtoSession.id, id));

	if (result.rowsAffected === 0) {
		throw new Error(`GTO session not found: ${id}`);
	}
}

// ─── 5. completeGtoSession ────────────────────────────────────────

export async function completeGtoSession(id: string): Promise<void> {
	const result = await db
		.update(gtoSession)
		.set({ status: 'completed' })
		.where(eq(gtoSession.id, id));

	if (result.rowsAffected === 0) {
		throw new Error(`GTO session not found: ${id}`);
	}
}

export async function pauseGtoSession(id: string): Promise<void> {
	const result = await db
		.update(gtoSession)
		.set({ status: 'paused' })
		.where(eq(gtoSession.id, id));

	if (result.rowsAffected === 0) {
		throw new Error(`GTO session not found: ${id}`);
	}
}

export async function resumeGtoSession(id: string): Promise<void> {
	const result = await db
		.update(gtoSession)
		.set({ status: 'active' })
		.where(eq(gtoSession.id, id));

	if (result.rowsAffected === 0) {
		throw new Error(`GTO session not found: ${id}`);
	}
}

// ─── 6. getActiveGtoSessionsForUser ────────────────────────────────

export type ActiveGtoSessionForUser = {
	gtoSessionId: string;
	name: string;
	status: string;
	hasCompletedTests: boolean;
	hasSubmittedWords: boolean;
	currentTestIndex: number;
};

export async function getActiveGtoSessionsForUser(
	userId: string
): Promise<ActiveGtoSessionForUser[]> {
	const rows = await db
		.select({
			gtoSessionId: gtoSessionParticipant.gtoSessionId,
			name: gtoSession.name,
			status: gtoSession.status,
			hasCompletedTests: gtoSessionParticipant.hasCompletedTests,
			hasSubmittedWords: gtoSessionParticipant.hasSubmittedWords,
			currentTestIndex: gtoSessionParticipant.currentTestIndex
		})
		.from(gtoSessionParticipant)
		.innerJoin(gtoSession, eq(gtoSession.id, gtoSessionParticipant.gtoSessionId))
		.where(
			and(
				eq(gtoSessionParticipant.userId, userId),
				inArray(gtoSession.status, ['active', 'paused'])
			)
		);

	return rows;
}

// ─── 7. markParticipantTestsCompleted ──────────────────────────────

export async function markParticipantTestsCompleted(
	gtoSessionId: string,
	userId: string
): Promise<void> {
	const result = await db
		.update(gtoSessionParticipant)
		.set({ hasCompletedTests: true })
		.where(
			and(
				eq(gtoSessionParticipant.gtoSessionId, gtoSessionId),
				eq(gtoSessionParticipant.userId, userId),
				eq(gtoSessionParticipant.hasCompletedTests, false)
			)
		);

	if (result.rowsAffected === 0) {
		const [participant] = await db
			.select()
			.from(gtoSessionParticipant)
			.where(
				and(
					eq(gtoSessionParticipant.gtoSessionId, gtoSessionId),
					eq(gtoSessionParticipant.userId, userId)
				)
			);

		if (!participant) {
			throw new Error(`Participant not found for session ${gtoSessionId} and user ${userId}`);
		}
		if (participant.hasCompletedTests) {
			throw new Error('Tests already marked as completed for this participant');
		}
	}
}

// ─── 8. submitWordScore ───────────────────────────────────────────

export async function submitWordScore(
	gtoSessionId: string,
	userId: string,
	score: number
): Promise<void> {
	if (score < 0 || score > 5) {
		throw new Error('Word score must be between 0 and 5');
	}

	const result = await db
		.update(gtoSessionParticipant)
		.set({ wordScore: score, hasSubmittedWords: true })
		.where(
			and(
				eq(gtoSessionParticipant.gtoSessionId, gtoSessionId),
				eq(gtoSessionParticipant.userId, userId),
				eq(gtoSessionParticipant.hasSubmittedWords, false)
			)
		);

	if (result.rowsAffected === 0) {
		const [participant] = await db
			.select()
			.from(gtoSessionParticipant)
			.where(
				and(
					eq(gtoSessionParticipant.gtoSessionId, gtoSessionId),
					eq(gtoSessionParticipant.userId, userId)
				)
			);

		if (!participant) {
			throw new Error(`Participant not found for session ${gtoSessionId} and user ${userId}`);
		}
		if (participant.hasSubmittedWords) {
			throw new Error('Word score already submitted for this participant');
		}
	}
}

// ─── 8b. saveSubmittedWords ──────────────────────────────────────
// Stores the participant's typed words. If a word set is assigned, also scores them.
// If no word set is assigned yet, stores words for later scoring.

export async function saveSubmittedWords(
	gtoSessionId: string,
	userId: string,
	words: string[]
): Promise<{ score: number | null; pending: boolean }> {
	const [participant] = await db
		.select()
		.from(gtoSessionParticipant)
		.where(
			and(
				eq(gtoSessionParticipant.gtoSessionId, gtoSessionId),
				eq(gtoSessionParticipant.userId, userId)
			)
		);

	if (!participant) {
		throw new Error(`Participant not found for session ${gtoSessionId} and user ${userId}`);
	}
	if (participant.hasSubmittedWords) {
		throw new Error('Words already submitted for this participant');
	}

	const wordsJson = JSON.stringify(words);

	if (participant.wordSetId) {
		// Word set already assigned — score now
		const sessionWords = await getWordSetWords(participant.wordSetId);
		function normalize(w: string): string {
			return w.toLowerCase().replace(/ё/g, 'е').trim();
		}
		let score = 0;
		for (let i = 0; i < sessionWords.length; i++) {
			const correct = normalize(sessionWords[i]);
			const submitted = normalize(words[i] || '');
			if (correct === submitted) score++;
		}

		await db
			.update(gtoSessionParticipant)
			.set({
				submittedWords: wordsJson,
				wordScore: score,
				hasSubmittedWords: true
			})
			.where(eq(gtoSessionParticipant.id, participant.id));

		return { score, pending: false };
	} else {
		// No word set yet — store words, mark as submitted but score is pending
		await db
			.update(gtoSessionParticipant)
			.set({
				submittedWords: wordsJson,
				hasSubmittedWords: true
			})
			.where(eq(gtoSessionParticipant.id, participant.id));

		return { score: null, pending: true };
	}
}

// ─── 8c. rescoreSubmittedWords ───────────────────────────────────
// Called when admin assigns a word set to a participant who already submitted words.
// Computes and saves the score.

export async function rescoreSubmittedWords(
	participantId: string,
	wordSetId: string
): Promise<number> {
	const [participant] = await db
		.select()
		.from(gtoSessionParticipant)
		.where(eq(gtoSessionParticipant.id, participantId));

	if (!participant || !participant.submittedWords) {
		return 0;
	}

	const words: string[] = JSON.parse(participant.submittedWords);
	const sessionWords = await getWordSetWords(wordSetId);

	function normalize(w: string): string {
		return w.toLowerCase().replace(/ё/g, 'е').trim();
	}
	let score = 0;
	for (let i = 0; i < sessionWords.length; i++) {
		const correct = normalize(sessionWords[i]);
		const submitted = normalize(words[i] || '');
		if (correct === submitted) score++;
	}

	await db
		.update(gtoSessionParticipant)
		.set({ wordScore: score, wordSetId })
		.where(eq(gtoSessionParticipant.id, participantId));

	return score;
}

// ─── 9. updateEditableMetrics ──────────────────────────────────────

export type EditableMetricUpdate = Partial<{
	balanceTest: string;
	mazeQ1: number;
	mazeQ2: number;
	mazeQ3: number;
	mazeVRNumber: number;
	mazeVRFileName: string;
	buttonTestNumber: number;
	buttonTestFileName: string;
	logic: number;
	wordSetNumber: number;
}>;

export async function updateEditableMetrics(
	participantId: string,
	metrics: EditableMetricUpdate
): Promise<void> {
	const result = await db
		.update(gtoEditableMetric)
		.set(metrics)
		.where(eq(gtoEditableMetric.participantId, participantId));

	if (result.rowsAffected === 0) {
		throw new Error(`Editable metrics not found for participant: ${participantId}`);
	}
}

// ─── 10. getGtoSessionMetrics ──────────────────────────────────────

export type StroopStageMetrics = {
	meanTime: number | null;
	stdDevTime: number | null;
	accuracy: number;
};

export type SimpleTestMetrics = {
	meanTime: number | null;
	stdDevTime: number | null;
	accuracy: number;
};

export type MunsterbergMetrics = {
	meanTime: number | null;
	stdDevTime: number | null;
	fractionGuessed: number;
	totalWordsHidden: number;
};

export type CampimetryStageMetrics = {
	meanTime: number | null;
	stdDevTime: number | null;
	meanDelta: number | null;
};

export type CampimetryBreakdown = {
	underPress: number;
	exact: number;
	overPress: number;
};

export type CampimetryMetrics = {
	stage1: CampimetryStageMetrics;
	stage2: CampimetryStageMetrics;
	stage2Breakdown: CampimetryBreakdown;
};

export type RavenDifficultyLevelMetrics = {
	correct: number;
	total: number;
	accuracy: number;
};

export type RavenDifficultyBreakdown = {
	level1: RavenDifficultyLevelMetrics;
	level2: RavenDifficultyLevelMetrics;
	level3: RavenDifficultyLevelMetrics;
};

export type RavenTaskClassBreakdown = Record<
	string,
	{ correct: number; total: number; label: string }
>;

export type RavenMetrics = {
	totalQuestions: number;
	correctCount: number;
	accuracy: number;
	averageResponseTimeMs: number;
	byDifficulty: RavenDifficultyBreakdown;
	byTaskClass: RavenTaskClassBreakdown;
};

export type ParticipantMetrics = {
	participantId: string;
	userId: string;
	firstname: string;
	lastname: string;
	sex: string;
	age: number;
	missingSurveyFields: string[];
	stroop: { stage1: StroopStageMetrics; stage2: StroopStageMetrics; stage3: StroopStageMetrics };
	math: SimpleTestMetrics;
	munsterberg: MunsterbergMetrics;
	campimetry: CampimetryMetrics;
	memory: SimpleTestMetrics;
	swallow: SimpleTestMetrics;
	raven: RavenMetrics;
	editableMetrics: GtoEditableMetricDetail;
	wordScore: number | null;
	submittedWords: string[] | null;
};

export async function getGtoSessionMetrics(gtoSessionId: string): Promise<ParticipantMetrics[]> {
	const sessionDetail = await getGtoSessionById(gtoSessionId);

	if (sessionDetail.participants.length === 0) {
		return [];
	}

	const userIds = sessionDetail.participants.map((p) => p.userId);

	// Batch load surveys
	const surveyRows = userIds.length
		? await db.select().from(profileSurvey).where(inArray(profileSurvey.userId, userIds))
		: [];
	const surveyMap = new Map(surveyRows.map((s) => [s.userId, s as Record<string, unknown>]));

	// Batch load all test sessions for this GTO session
	const allTestSessions = await db
		.select()
		.from(session)
		.where(and(eq(session.gtoSessionId, gtoSessionId), inArray(session.userId, userIds)));

	const testSessionsByUser = new Map<string, typeof allTestSessions>();
	for (const ts of allTestSessions) {
		const list = testSessionsByUser.get(ts.userId) ?? [];
		list.push(ts);
		testSessionsByUser.set(ts.userId, list);
	}

	// Collect all session IDs for each test type
	const stroopSessionIds: string[] = [];
	const mathSessionIds: string[] = [];
	const munsterbergSessionIds: string[] = [];
	const campimetrySessionIds: string[] = [];
	const memorySessionIds: string[] = [];
	const swallowSessionIds: string[] = [];
	const ravenSessionIds: string[] = [];

	for (const ts of allTestSessions) {
		switch (ts.testType) {
			case 'stroop':
				stroopSessionIds.push(ts.id);
				break;
			case 'math':
				mathSessionIds.push(ts.id);
				break;
			case 'munsterberg':
				munsterbergSessionIds.push(ts.id);
				break;
			case 'campimetry':
				campimetrySessionIds.push(ts.id);
				break;
			case 'memory':
				memorySessionIds.push(ts.id);
				break;
			case 'swallow':
				swallowSessionIds.push(ts.id);
				break;
			case 'ravenMatrices':
				ravenSessionIds.push(ts.id);
				break;
		}
	}

	// Batch load attempts
	const [
		stroopAttempts,
		mathAttempts,
		munsterbergAttempts,
		campimetryAttempts,
		memoryAttempts,
		swallowAttempts,
		ravenAttempts
	] = await Promise.all([
		stroopSessionIds.length
			? db
					.select()
					.from(stroopAttempt)
					.where(inArray(stroopAttempt.sessionId, stroopSessionIds))
			: [],
		mathSessionIds.length
			? db.select().from(mathAttempt).where(inArray(mathAttempt.sessionId, mathSessionIds))
			: [],
		munsterbergSessionIds.length
			? db
					.select()
					.from(munsterbergAttempt)
					.where(inArray(munsterbergAttempt.sessionId, munsterbergSessionIds))
			: [],
		campimetrySessionIds.length
			? db
					.select()
					.from(campimetryAttempt)
					.where(inArray(campimetryAttempt.sessionId, campimetrySessionIds))
			: [],
		memorySessionIds.length
			? db
					.select()
					.from(memoryAttempt)
					.where(inArray(memoryAttempt.sessionId, memorySessionIds))
			: [],
		swallowSessionIds.length
			? db
					.select()
					.from(swallowAttempt)
					.where(inArray(swallowAttempt.sessionId, swallowSessionIds))
			: [],
		ravenSessionIds.length
			? db.select().from(ravenAttempt).where(inArray(ravenAttempt.sessionId, ravenSessionIds))
			: []
	]);

	// Index attempts by sessionId
	function indexBySessionId<T extends { sessionId: string }>(rows: T[]): Map<string, T[]> {
		const map = new Map<string, T[]>();
		for (const row of rows) {
			const list = map.get(row.sessionId) ?? [];
			list.push(row);
			map.set(row.sessionId, list);
		}
		return map;
	}

	const stroopAttemptsMap = indexBySessionId(stroopAttempts);
	const mathAttemptsMap = indexBySessionId(mathAttempts);
	const munsterbergAttemptsMap = indexBySessionId(munsterbergAttempts);
	const campimetryAttemptsMap = indexBySessionId(campimetryAttempts);
	const memoryAttemptsMap = indexBySessionId(memoryAttempts);
	const swallowAttemptsMap = indexBySessionId(swallowAttempts);
	const ravenAttemptsMap = indexBySessionId(ravenAttempts);

	// Build per-user metrics
	const metrics: ParticipantMetrics[] = [];

	for (const participant of sessionDetail.participants) {
		const age = calculateAge(participant.birthday);

		const missingSurveyFields = computeMissingSurveyFields(
			(surveyMap.get(participant.userId) as Record<string, unknown>) ?? null
		);

		const testSessions = testSessionsByUser.get(participant.userId) ?? [];

		// ─── Stroop ─────────────────────────────────────────────
		const stroopSession = testSessions.find((s) => s.testType === 'stroop');
		let stroopMetrics: ParticipantMetrics['stroop'] = {
			stage1: { meanTime: null, stdDevTime: null, accuracy: 0 },
			stage2: { meanTime: null, stdDevTime: null, accuracy: 0 },
			stage3: { meanTime: null, stdDevTime: null, accuracy: 0 }
		};

		if (stroopSession) {
			const attempts = stroopAttemptsMap.get(stroopSession.id) ?? [];
			for (const stage of [1, 2, 3] as const) {
				const stageAttempts = attempts.filter((a) => a.stage === stage);
				const times = stageAttempts.map((a) => a.time);
				const correctness = stageAttempts.map((a) => a.isCorrect);
				stroopMetrics[`stage${stage as 1 | 2 | 3}`] = {
					meanTime: mean(times),
					stdDevTime: stdDev(times),
					accuracy: accuracy(correctness, stageAttempts.length)
				};
			}
		}

		// ─── Math ───────────────────────────────────────────────
		const mathSession = testSessions.find((s) => s.testType === 'math');
		let mathMetrics: SimpleTestMetrics = { meanTime: null, stdDevTime: null, accuracy: 0 };

		if (mathSession) {
			const attempts = mathAttemptsMap.get(mathSession.id) ?? [];
			const times = attempts.map((a) => a.time);
			const correctness = attempts.map((a) => a.isCorrect);
			mathMetrics = {
				meanTime: mean(times),
				stdDevTime: stdDev(times),
				accuracy: accuracy(correctness, attempts.length)
			};
		}

		// ─── Munsterberg ────────────────────────────────────────
		const munsterbergSession = testSessions.find((s) => s.testType === 'munsterberg');
		let munsterbergMetrics: MunsterbergMetrics = {
			meanTime: null,
			stdDevTime: null,
			fractionGuessed: 0,
			totalWordsHidden: 0
		};

		if (munsterbergSession) {
			const attempts = munsterbergAttemptsMap.get(munsterbergSession.id) ?? [];
			const times = attempts.map((a) => a.time);
			const guessedCount = attempts.filter((a) => a.guessed).length;
			const totalWordsHidden = attempts.length;
			munsterbergMetrics = {
				meanTime: mean(times),
				stdDevTime: stdDev(times),
				fractionGuessed: totalWordsHidden > 0 ? guessedCount / totalWordsHidden : 0,
				totalWordsHidden
			};
		}

		// ─── Campimetry ────────────────────────────────────────
		const campimetrySession = testSessions.find((s) => s.testType === 'campimetry');
		let campimetryMetrics: CampimetryMetrics = {
			stage1: { meanTime: null, stdDevTime: null, meanDelta: null },
			stage2: { meanTime: null, stdDevTime: null, meanDelta: null },
			stage2Breakdown: { underPress: 0, exact: 0, overPress: 0 }
		};

		if (campimetrySession) {
			const attempts = campimetryAttemptsMap.get(campimetrySession.id) ?? [];

			// Stage 1
			const stage1Attempts = attempts.filter((a) => a.stage === 1);
			const stage1Times = stage1Attempts.map((a) => a.time);
			const stage1Deltas = stage1Attempts.map((a) => a.delta);
			campimetryMetrics.stage1 = {
				meanTime: mean(stage1Times),
				stdDevTime: stdDev(stage1Times),
				meanDelta: mean(stage1Deltas)
			};

			// Stage 2
			const stage2Attempts = attempts.filter((a) => a.stage === 2);
			const stage2Times = stage2Attempts.map((a) => a.time);
			const stage2Deltas = stage2Attempts.map((a) => a.delta);
			campimetryMetrics.stage2 = {
				meanTime: mean(stage2Times),
				stdDevTime: stdDev(stage2Times),
				meanDelta: mean(stage2Deltas)
			};

			// Stage 2 breakdown
			campimetryMetrics.stage2Breakdown = {
				underPress: stage2Attempts.filter((a) => a.delta > 0).length,
				exact: stage2Attempts.filter((a) => a.delta === 0).length,
				overPress: stage2Attempts.filter((a) => a.delta < 0).length
			};
		}

		// ─── Memory ─────────────────────────────────────────────
		const memorySession = testSessions.find((s) => s.testType === 'memory');
		let memoryMetrics: SimpleTestMetrics = { meanTime: null, stdDevTime: null, accuracy: 0 };

		if (memorySession) {
			const attempts = memoryAttemptsMap.get(memorySession.id) ?? [];
			const times = attempts.map((a) => a.time);
			const correctness = attempts.map((a) => a.isCorrect);
			memoryMetrics = {
				meanTime: mean(times),
				stdDevTime: stdDev(times),
				accuracy: accuracy(correctness, attempts.length)
			};
		}

		// ─── Swallow ────────────────────────────────────────────
		const swallowSession = testSessions.find((s) => s.testType === 'swallow');
		let swallowMetrics: SimpleTestMetrics = { meanTime: null, stdDevTime: null, accuracy: 0 };

		if (swallowSession) {
			const attempts = swallowAttemptsMap.get(swallowSession.id) ?? [];
			const times = attempts.map((a) => a.time);
			const correctness = attempts.map((a) => a.isCorrect);
			swallowMetrics = {
				meanTime: mean(times),
				stdDevTime: stdDev(times),
				accuracy: accuracy(correctness, attempts.length)
			};
		}

		// ─── Raven ──────────────────────────────────────────────
		const ravenSession = testSessions.find((s) => s.testType === 'ravenMatrices');
		let ravenMetrics: RavenMetrics = {
			totalQuestions: 0,
			correctCount: 0,
			accuracy: 0,
			averageResponseTimeMs: 0,
			byDifficulty: {
				level1: { correct: 0, total: 0, accuracy: 0 },
				level2: { correct: 0, total: 0, accuracy: 0 },
				level3: { correct: 0, total: 0, accuracy: 0 }
			},
			byTaskClass: {}
		};

		if (ravenSession) {
			const attempts = ravenAttemptsMap.get(ravenSession.id) ?? [];
			const totalQuestions = attempts.length;
			const correctCount = attempts.filter((a) => a.isCorrect).length;
			const totalDurationMs = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0);
			const avgTime = totalQuestions ? Math.round(totalDurationMs / totalQuestions) : 0;

			const byDifficulty: RavenDifficultyBreakdown = {
				level1: { correct: 0, total: 0, accuracy: 0 },
				level2: { correct: 0, total: 0, accuracy: 0 },
				level3: { correct: 0, total: 0, accuracy: 0 }
			};

			for (const a of attempts) {
				const lvl = a.difficultyLevel as 1 | 2 | 3;
				if (lvl >= 1 && lvl <= 3) {
					const key = `level${lvl}` as const;
					byDifficulty[key].total++;
					if (a.isCorrect) byDifficulty[key].correct++;
				}
			}

			for (const key of ['level1', 'level2', 'level3'] as const) {
				const d = byDifficulty[key];
				d.accuracy = d.total > 0 ? d.correct / d.total : 0;
			}

			const byTaskClass: RavenTaskClassBreakdown = {};
			for (const a of attempts) {
				const label = TASK_CLASS_LABELS[a.taskClass as TaskClass] ?? a.taskClass;
				if (!byTaskClass[a.taskClass]) {
					byTaskClass[a.taskClass] = { correct: 0, total: 0, label };
				}
				byTaskClass[a.taskClass].total++;
				if (a.isCorrect) byTaskClass[a.taskClass].correct++;
			}

			ravenMetrics = {
				totalQuestions,
				correctCount,
				accuracy: totalQuestions ? correctCount / totalQuestions : 0,
				averageResponseTimeMs: avgTime,
				byDifficulty,
				byTaskClass
			};
		}

		metrics.push({
			participantId: participant.id,
			userId: participant.userId,
			firstname: participant.firstname,
			lastname: participant.lastname,
			sex: participant.sex,
			age,
			missingSurveyFields,
			stroop: stroopMetrics,
			math: mathMetrics,
			munsterberg: munsterbergMetrics,
			campimetry: campimetryMetrics,
			memory: memoryMetrics,
			swallow: swallowMetrics,
			raven: ravenMetrics,
			editableMetrics: participant.editableMetrics,
			wordScore: participant.wordScore,
			submittedWords: participant.submittedWords
		});
	}

	return metrics;
}

// ─── 11. getAuthorizedUsers ────────────────────────────────────────

export type AuthorizedUser = {
	id: string;
	firstname: string;
	lastname: string;
	sex: string;
	createdAt: string;
	lastActiveAt: string | null;
	gtoId: string | null;
	missingSurveyFields: string[];
};

export async function getAuthorizedUsers(): Promise<AuthorizedUser[]> {
	const rows = await db
		.select({
			userId: user.id,
			firstname: user.firstname,
			lastname: user.lastname,
			sex: user.sex,
			createdAt: user.createdAt,
			lastActiveAt: user.lastActiveAt,
			gtoId: profileSurvey.gtoId,
			survey: profileSurvey
		})
		.from(user)
		.leftJoin(profileSurvey, eq(profileSurvey.userId, user.id))
		.orderBy(desc(user.createdAt));

	return rows.map((row) => ({
		id: row.userId,
		firstname: row.firstname,
		lastname: row.lastname,
		sex: row.sex,
		createdAt: row.createdAt,
		lastActiveAt: row.lastActiveAt,
		gtoId: row.gtoId,
		missingSurveyFields: computeMissingSurveyFields(
			row.survey as Record<string, unknown> | null
		)
	}));
}

// ─── 12. Word set helpers ─────────────────────────────────────────

export type GtoWordSetListItem = {
	id: string;
	setNumber: number;
	words: string[];
	createdAt: string;
};

export async function getWordSets(): Promise<GtoWordSetListItem[]> {
	const rows = await db.select().from(gtoWordSet).orderBy(desc(gtoWordSet.createdAt));
	return rows.map((r) => ({
		id: r.id,
		setNumber: r.setNumber,
		words: [r.word1, r.word2, r.word3, r.word4, r.word5],
		createdAt: r.createdAt
	}));
}

export async function generateWordSets(count: number, allWords: string[]): Promise<void> {
	function pickRandom(arr: string[], n: number): string[] {
		const shuffled = [...arr].sort(() => 0.5 - Math.random());
		return shuffled.slice(0, n);
	}

	const existing = await db
		.select({ max: sql<number>`COALESCE(MAX(${gtoWordSet.setNumber}), 0)` })
		.from(gtoWordSet);
	let startNumber = (existing[0]?.max ?? 0) + 1;

	const toInsert = [];
	for (let i = 0; i < count; i++) {
		const words = pickRandom(allWords, 5);
		toInsert.push({
			id: generate(),
			setNumber: startNumber + i,
			word1: words[0],
			word2: words[1],
			word3: words[2],
			word4: words[3],
			word5: words[4]
		});
	}

	if (toInsert.length > 0) {
		await db.insert(gtoWordSet).values(toInsert);
	}
}

export async function createWordSet(words: string[]): Promise<GtoWordSetListItem> {
	if (words.length !== 5 || words.some((w) => !w.trim())) {
		throw new Error('Word set must have exactly 5 non-empty words');
	}
	const existing = await db
		.select({ max: sql<number>`COALESCE(MAX(${gtoWordSet.setNumber}), 0)` })
		.from(gtoWordSet);
	const setNumber = (existing[0]?.max ?? 0) + 1;
	const [row] = await db
		.insert(gtoWordSet)
		.values({
			id: generate(),
			setNumber,
			word1: words[0].trim().toLowerCase(),
			word2: words[1].trim().toLowerCase(),
			word3: words[2].trim().toLowerCase(),
			word4: words[3].trim().toLowerCase(),
			word5: words[4].trim().toLowerCase()
		})
		.returning();
	return {
		id: row.id,
		setNumber: row.setNumber,
		words: [row.word1, row.word2, row.word3, row.word4, row.word5],
		createdAt: row.createdAt
	};
}

export async function updateWordSet(id: string, words: string[]): Promise<GtoWordSetListItem> {
	if (words.length !== 5 || words.some((w) => !w.trim())) {
		throw new Error('Word set must have exactly 5 non-empty words');
	}
	const [row] = await db
		.update(gtoWordSet)
		.set({
			word1: words[0].trim().toLowerCase(),
			word2: words[1].trim().toLowerCase(),
			word3: words[2].trim().toLowerCase(),
			word4: words[3].trim().toLowerCase(),
			word5: words[4].trim().toLowerCase()
		})
		.where(eq(gtoWordSet.id, id))
		.returning();
	if (!row) throw new Error('Word set not found');
	return {
		id: row.id,
		setNumber: row.setNumber,
		words: [row.word1, row.word2, row.word3, row.word4, row.word5],
		createdAt: row.createdAt
	};
}

export async function deleteWordSet(id: string): Promise<void> {
	// Check if any participant references this word set
	const [referenced] = await db
		.select({ id: gtoSessionParticipant.id })
		.from(gtoSessionParticipant)
		.where(eq(gtoSessionParticipant.wordSetId, id))
		.limit(1);
	if (referenced) {
		throw new Error('Cannot delete word set: it is assigned to one or more participants');
	}
	await db.delete(gtoWordSet).where(eq(gtoWordSet.id, id));
}

export async function assignWordSet(participantId: string, wordSetId: string): Promise<void> {
	await db
		.update(gtoSessionParticipant)
		.set({ wordSetId })
		.where(eq(gtoSessionParticipant.id, participantId));
}

export async function addParticipant(sessionId: string, userId: string): Promise<string> {
	const participantId = generate();
	await db.transaction(async (tx) => {
		await tx.insert(gtoSessionParticipant).values({
			id: participantId,
			gtoSessionId: sessionId,
			userId,
			hasCompletedTests: false,
			hasSubmittedWords: false
		});
		await tx.insert(gtoEditableMetric).values({
			id: generate(),
			participantId
		});
	});
	return participantId;
}

export async function removeParticipant(participantId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.delete(gtoEditableMetric)
			.where(eq(gtoEditableMetric.participantId, participantId));
		await tx.delete(gtoSessionParticipant).where(eq(gtoSessionParticipant.id, participantId));
	});
}

export async function getWordSetWords(wordSetId: string): Promise<string[]> {
	const [set] = await db.select().from(gtoWordSet).where(eq(gtoWordSet.id, wordSetId));
	if (!set) return [];
	return [set.word1, set.word2, set.word3, set.word4, set.word5];
}
