import { db } from '$lib/server/db';
import { wordMorphingSessions } from '../schema';
import { eq } from 'drizzle-orm';

export async function createWordMorphingSession(
	userId: string,
	timerStartedAt: Date,
	timerValueInSeconds: number
) {
	if (!db || !userId) {
		throw new Error('Database connection or userId is not provided');
	}

	try {
		await db.insert(wordMorphingSessions).values({
			userId,
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
