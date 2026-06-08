import { db } from '$lib/server/db';
import { testAttempt, testAnswer } from '$lib/server/db/stats.schema';
import { user } from '$lib/server/db/auth.schema';
import { and, desc, eq, sql, gte } from 'drizzle-orm';


//Готовые запросы для админ-панели, чтобы не лезть в БД напрямую.

/** Сводка по платформе в целом */
export async function getOverview() {
	const [totals] = await db
		.select({
			totalAttempts: sql<number>`count(*)::int`,
			finishedAttempts: sql<number>`count(*) filter (where ${testAttempt.finishedAt} is not null)::int`
		})
		.from(testAttempt);

	const [usersRow] = await db
		.select({ totalUsers: sql<number>`count(*)::int` })
		.from(user);

	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const [recent] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(testAttempt)
		.where(gte(testAttempt.startedAt, sevenDaysAgo));

	const byTest = await db
		.select({
			testSlug: testAttempt.testSlug,
			attempts: sql<number>`count(*)::int`,
			avgNormalizedScore: sql<number | null>`avg(${testAttempt.normalizedScore})::float`,
			avgAccuracy: sql<number | null>`avg(${testAttempt.score}::float / nullif(${testAttempt.maxScore}, 0))::float`
		})
		.from(testAttempt)
		.where(sql`${testAttempt.finishedAt} is not null`)
		.groupBy(testAttempt.testSlug);

	return {
		totalUsers: usersRow.totalUsers,
		totalAttempts: totals.totalAttempts,
		finishedAttempts: totals.finishedAttempts,
		attemptsLast7Days: recent.count,
		byTest
	};
}

/** Список последних попыток (для основной таблицы админки) */
export async function listRecentAttempts(limit = 50) {
	return db
		.select({
			id: testAttempt.id,
			testSlug: testAttempt.testSlug,
			startedAt: testAttempt.startedAt,
			finishedAt: testAttempt.finishedAt,
			durationMs: testAttempt.durationMs,
			score: testAttempt.score,
			maxScore: testAttempt.maxScore,
			normalizedScore: testAttempt.normalizedScore,
			userId: testAttempt.userId,
			userEmail: user.email,
			userName: user.name
		})
		.from(testAttempt)
		.leftJoin(user, eq(user.id, testAttempt.userId))
		.orderBy(desc(testAttempt.startedAt))
		.limit(limit);
}

/** Все попытки конкретного пользователя в хронологическом порядке */
export async function getUserAttempts(userId: string) {
	return db
		.select()
		.from(testAttempt)
		.where(eq(testAttempt.userId, userId))
		.orderBy(desc(testAttempt.startedAt));
}

/** Подробные ответы по одной попытке (для диалога «детали попытки») */
export async function getAttemptDetail(attemptId: string) {
	const [attempt] = await db
		.select()
		.from(testAttempt)
		.where(eq(testAttempt.id, attemptId));

	if (!attempt) return null;

	const answers = await db
		.select()
		.from(testAnswer)
		.where(eq(testAnswer.attemptId, attemptId))
		.orderBy(testAnswer.answeredAt);

	return { attempt, answers };
}

/** Динамика результатов одного пользователя по конкретному тесту */
export async function getUserProgress(userId: string, testSlug: string) {
	return db
		.select({
			startedAt: testAttempt.startedAt,
			score: testAttempt.score,
			maxScore: testAttempt.maxScore,
			normalizedScore: testAttempt.normalizedScore,
			durationMs: testAttempt.durationMs
		})
		.from(testAttempt)
		.where(and(eq(testAttempt.userId, userId), eq(testAttempt.testSlug, testSlug)))
		.orderBy(testAttempt.startedAt);
}
