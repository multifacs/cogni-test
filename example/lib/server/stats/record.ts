import { db } from '$lib/server/db';
import { testAttempt, testAnswer } from '$lib/server/db/stats.schema';
import type { AttemptSubmitPayload } from '$lib/stats/contracts';


//Записывает завершённую попытку теста
export async function recordAttempt(userId: string, payload: AttemptSubmitPayload): Promise<string> {
	const startedAt = new Date(payload.startedAt);
	const finishedAt = new Date(startedAt.getTime() + payload.durationMs);

	return await db.transaction(async (tx) => {
		const [attempt] = await tx
			.insert(testAttempt)
			.values({
				userId,
				testSlug: payload.testSlug,
				startedAt,
				finishedAt,
				durationMs: payload.durationMs,
				score: payload.score,
				maxScore: payload.maxScore,
				normalizedScore: payload.normalizedScore ?? null,
				meta: (payload.meta as Record<string, unknown> | undefined) ?? null
			})
			.returning({ id: testAttempt.id });

		if (payload.answers.length > 0) {
			await tx.insert(testAnswer).values(
				payload.answers.map((answer) => ({
					attemptId: attempt.id,
					questionId: answer.questionId,
					answer: answer.answer ?? null,
					isCorrect: answer.isCorrect ?? null,
					reactionTimeMs: answer.reactionTimeMs ?? null,
					meta: (answer.meta as Record<string, unknown> | undefined) ?? null
				}))
			);
		}

		return attempt.id;
	});
}
