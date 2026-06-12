// profileSurvey.controller.ts
import { db } from '$lib/server/db';
import { profileSurvey } from '$lib/server/db/schema';
import type { InsertProfileSurvey, SelectProfileSurvey } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Получить профиль пользователя по userId
 */
export async function getProfileSurvey(userId: string): Promise<SelectProfileSurvey | null> {
	const result = await db.query.profileSurvey.findFirst({
		where: (fields, { eq }) => eq(fields.userId, userId)
	});

	return result || null;
}

/**
 * Обновить или создать профиль пользователя
 * Если профиль существует - обновляет, если нет - создает
 */
export async function updateProfileSurvey(
	userId: string,
	data: Partial<Omit<InsertProfileSurvey, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SelectProfileSurvey> {
	const existingProfile = await getProfileSurvey(userId);

	const now = new Date().toISOString();

	if (existingProfile) {
		// Обновляем существующий профиль
		const updated = await db
			.update(profileSurvey)
			.set({
				...data,
				updatedAt: now
			})
			.where(eq(profileSurvey.userId, userId))
			.returning();

		if (!updated[0]) {
			throw new Error('Failed to update profile survey');
		}

		return updated[0];
	} else {
		// Создаем новый профиль
		const newProfile: InsertProfileSurvey = {
			userId: userId,
			...data,
			createdAt: now,
			updatedAt: now
		};

		const created = await db.insert(profileSurvey).values(newProfile).returning();

		if (!created[0]) {
			throw new Error('Failed to create profile survey');
		}

		return created[0];
	}
}
