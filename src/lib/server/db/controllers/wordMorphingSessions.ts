import { db } from '$lib/server/db';
import { wordMorphingSessions } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createWordMorphingSession(
	userId: string,
    category: string,
    expectedCombos: string[],
	timerStartedAt: Date,
	timerValueInSeconds: number,
) {
	if (!db || !userId) {
		throw new Error('Database connection or userId is not provided');
	}

	try {
		await db.insert(wordMorphingSessions).values({
			userId,
            category,
			expectedCombos,
			timerStartedAt: timerStartedAt,
			timerValueInSeconds,
			isActive: true
		});
	} catch (error) {
		throw new Error(
			`Failed to create word morphing session: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

export async function getWordMorphingSessionByUserId(userId: string) {
	if (!db || !userId) {
		throw new Error('Database connection or userId is not provided');
	}

	const [session] = await db
		.select()
		.from(wordMorphingSessions)
		.where(eq(wordMorphingSessions.userId, userId));
	return session ?? null;
}

export async function deleteWordMorphingSessionByUserId(userId: string) {
	if (!db || !userId) {
		throw new Error('Database connection or userId is not provided');
	}

	try {
		await db.delete(wordMorphingSessions).where(eq(wordMorphingSessions.userId, userId));
	} catch (error) {
		throw new Error(
			`Failed to delete word morphing session: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

export async function hasActiveSession(userId: string) {
	if (!db || !userId) {
		throw new Error('Database connection or userId is not provided');
	}

	let count = 0;

	try {
		count = await db.$count(
			wordMorphingSessions,
			and(eq(wordMorphingSessions.userId, userId), eq(wordMorphingSessions.isActive, true))
		);
	} catch (error) {
		throw new Error(
			`Failed to get word morphing session: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	return count > 0;
}
