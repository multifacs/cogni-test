import type { User } from '../types';
import { MODE, DB_URL_DEV, DB_URL_PROD } from '$env/static/private';
import { checkFormData, formDataToUser } from '$lib/utils';
import { fail } from '@sveltejs/kit';

let DB_URL: string;
if (MODE == 'DEV') {
	DB_URL = DB_URL_DEV;
} else {
	DB_URL = DB_URL_PROD;
}

import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

function checkUserInput(input: Partial<User>): input is User {
	return !!(input.firstname && input.lastname && input.birthday && input.sex);
}

export async function createUser(userInput: Partial<User>): Promise<User | null> {
	if (!checkUserInput(userInput)) {
		return null;
	}

	try {
		// Проверяем существование пользователя
		const [existing] = await db
			.select()
			.from(user)
			.where(
				and(
					eq(user.firstname, userInput.firstname),
					eq(user.lastname, userInput.lastname),
					eq(user.birthday, userInput.birthday),
					eq(user.sex, userInput.sex)
				)
			);

		if (existing) {
			return existing;
		}

		// Создаем нового пользователя
		const [newUser] = await db
			.insert(user)
			.values({
				firstname: userInput.firstname,
				lastname: userInput.lastname,
				birthday: userInput.birthday,
				sex: userInput.sex
			})
			.returning();

		return newUser;
	} catch (error) {
		// Можно добавить более детальную обработку ошибок в зависимости от типа ошибки
		throw new Error(
			`Failed to create user: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

export async function getUserById(id: string): Promise<User | null> {
	const [found] = await db.select().from(user).where(eq(user.id, id));
	return found ?? null;
}
