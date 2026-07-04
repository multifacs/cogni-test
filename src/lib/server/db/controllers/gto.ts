import { db } from '$lib/server/db';
import { session, user, profileSurvey } from '$lib/server/db/schema';
import {
	gtoSession,
	gtoSessionParticipant,
	gtoSessionWord,
	gtoEditableMetric
} from '$lib/server/db/models/gto';
import {
	stroopAttempt,
	mathAttempt,
	munsterbergAttempt,
	campimetryAttempt,
	memoryAttempt,
	swallowAttempt
} from '$lib/server/db/models/tests';
import { generate } from 'short-uuid';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';

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
	'isGamer'
] as const;

// ─── Math helpers ───────────────────────────────────────────────────

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
	participantIds: string[],
	words: string[]
): Promise<string> {
	const gtoSessionId = generate();

	await db.insert(gtoSession).values({
		id: gtoSessionId,
		name,
		type
	});

	if (participantIds.length > 0) {
		await db.insert(gtoSessionParticipant).values(
			participantIds.map((userId) => ({
				id: generate(),
				gtoSessionId,
				userId,
				hasCompletedTests: false,
				hasSubmittedWords: false
			}))
		);

		// For each participant, create editable metrics row
		const participants = await db
			.select({ id: gtoSessionParticipant.id })
			.from(gtoSessionParticipant)
			.where(eq(gtoSessionParticipant.gtoSessionId, gtoSessionId));

		if (participants.length > 0) {
			await db.insert(gtoEditableMetric).values(
				participants.map((p) => ({
					id: generate(),
					participantId: p.id
				}))
			);
		}
	}

	if (words.length > 0) {
		await db.insert(gtoSessionWord).values(
			words.slice(0, 5).map((word, index) => ({
				id: generate(),
				gtoSessionId,
				word,
				position: index
			}))
		);
	}

	return gtoSessionId;
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
	currentTestIndex: number;
	createdAt: string;
	participants: GtoSessionParticipantDetail[];
	words: { word: string; position: number }[];
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
	wordScore: number | null;
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
			wordScore: gtoSessionParticipant.wordScore,
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
			buttonTestFileName: gtoEditableMetric.buttonTestFileName
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
		wordScore: row.wordScore,
		editableMetrics: {
			id: row.metricId,
			balanceTest: row.balanceTest,
			mazeQ1: row.mazeQ1,
			mazeQ2: row.mazeQ2,
			mazeQ3: row.mazeQ3,
			mazeVRNumber: row.mazeVRNumber,
			mazeVRFileName: row.mazeVRFileName,
			buttonTestNumber: row.buttonTestNumber,
			buttonTestFileName: row.buttonTestFileName
		}
	}));

	// Words
	const wordRows = await db
		.select({
			word: gtoSessionWord.word,
			position: gtoSessionWord.position
		})
		.from(gtoSessionWord)
		.where(eq(gtoSessionWord.gtoSessionId, id))
		.orderBy(asc(gtoSessionWord.position));

	return {
		id: gtoSessionRow.id,
		name: gtoSessionRow.name,
		type: gtoSessionRow.type,
		status: gtoSessionRow.status,
		currentTestIndex: gtoSessionRow.currentTestIndex,
		createdAt: gtoSessionRow.createdAt,
		participants,
		words: wordRows
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

// ─── 6. getActiveGtoSessionsForUser ────────────────────────────────

export type ActiveGtoSessionForUser = {
	gtoSessionId: string;
	name: string;
	hasCompletedTests: boolean;
	hasSubmittedWords: boolean;
};

export async function getActiveGtoSessionsForUser(
	userId: string
): Promise<ActiveGtoSessionForUser[]> {
	const rows = await db
		.select({
			gtoSessionId: gtoSessionParticipant.gtoSessionId,
			name: gtoSession.name,
			hasCompletedTests: gtoSessionParticipant.hasCompletedTests,
			hasSubmittedWords: gtoSessionParticipant.hasSubmittedWords
		})
		.from(gtoSessionParticipant)
		.innerJoin(gtoSession, eq(gtoSession.id, gtoSessionParticipant.gtoSessionId))
		.where(and(eq(gtoSessionParticipant.userId, userId), eq(gtoSession.status, 'active')));

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
}>;

export async function updateEditableMetrics(
	participantId: string,
	metrics: EditableMetricUpdate
): Promise<void> {
	await db
		.update(gtoEditableMetric)
		.set(metrics)
		.where(eq(gtoEditableMetric.participantId, participantId));
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
	editableMetrics: GtoEditableMetricDetail;
	wordScore: number | null;
};

export async function getGtoSessionMetrics(gtoSessionId: string): Promise<ParticipantMetrics[]> {
	const sessionDetail = await getGtoSessionById(gtoSessionId);

	const metrics: ParticipantMetrics[] = [];

	for (const participant of sessionDetail.participants) {
		const age = calculateAge(participant.birthday);

		// Survey fields
		const [survey] = await db
			.select()
			.from(profileSurvey)
			.where(eq(profileSurvey.userId, participant.userId));

		const missingSurveyFields = computeMissingSurveyFields(
			survey as Record<string, unknown> | null
		);

		// Find test sessions for this participant in this GTO session
		const testSessions = await db
			.select()
			.from(session)
			.where(
				and(eq(session.gtoSessionId, gtoSessionId), eq(session.userId, participant.userId))
			);

		// ─── Stroop ─────────────────────────────────────────────
		const stroopSession = testSessions.find((s) => s.testType === 'stroop');
		let stroopMetrics: ParticipantMetrics['stroop'] = {
			stage1: { meanTime: null, stdDevTime: null, accuracy: 0 },
			stage2: { meanTime: null, stdDevTime: null, accuracy: 0 },
			stage3: { meanTime: null, stdDevTime: null, accuracy: 0 }
		};

		if (stroopSession) {
			const attempts = await db
				.select()
				.from(stroopAttempt)
				.where(eq(stroopAttempt.sessionId, stroopSession.id));

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
			const attempts = await db
				.select()
				.from(mathAttempt)
				.where(eq(mathAttempt.sessionId, mathSession.id));

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
			const attempts = await db
				.select()
				.from(munsterbergAttempt)
				.where(eq(munsterbergAttempt.sessionId, munsterbergSession.id));

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
			const attempts = await db
				.select()
				.from(campimetryAttempt)
				.where(eq(campimetryAttempt.sessionId, campimetrySession.id));

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
			const attempts = await db
				.select()
				.from(memoryAttempt)
				.where(eq(memoryAttempt.sessionId, memorySession.id));

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
			const attempts = await db
				.select()
				.from(swallowAttempt)
				.where(eq(swallowAttempt.sessionId, swallowSession.id));

			const times = attempts.map((a) => a.time);
			const correctness = attempts.map((a) => a.isCorrect);
			swallowMetrics = {
				meanTime: mean(times),
				stdDevTime: stdDev(times),
				accuracy: accuracy(correctness, attempts.length)
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
			editableMetrics: participant.editableMetrics,
			wordScore: participant.wordScore
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
		missingSurveyFields: computeMissingSurveyFields(
			row.survey as Record<string, unknown> | null
		)
	}));
}

// ─── 12. getGtoSessionWords ────────────────────────────────────────

export type GtoSessionWordItem = {
	word: string;
	position: number;
};

export async function getGtoSessionWords(gtoSessionId: string): Promise<GtoSessionWordItem[]> {
	const words = await db
		.select({
			word: gtoSessionWord.word,
			position: gtoSessionWord.position
		})
		.from(gtoSessionWord)
		.where(eq(gtoSessionWord.gtoSessionId, gtoSessionId))
		.orderBy(asc(gtoSessionWord.position));

	return words;
}
