import type { User } from '../types';

import { db } from '$lib/server/db';
import { profileSurvey, session, user } from '$lib/server/db/schema';
import { sql, eq, and } from 'drizzle-orm';

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

export type TestType = 'math' | 'stroop' | 'munsterberg' | 'memory' | 'swallow' | 'campimetry';

const TEST_TYPES: TestType[] = ['math', 'stroop', 'munsterberg', 'memory', 'swallow', 'campimetry'];

// Поля анкеты, которые проверяем на null
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

function formatDate(date: Date | string | number): string {
	const d = new Date(date);

	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();

	return `${day}.${month}.${year}`;
}

export async function getUsersAnalytics() {
	// Пользователи + анкета
	const rows = await db
		.select({
			userId: user.id,
			firstname: user.firstname,
			lastname: user.lastname,
			birthday: user.birthday,
			sex: user.sex,
			survey: profileSurvey
		})
		.from(user)
		.leftJoin(profileSurvey, eq(profileSurvey.userId, user.id));

	// Все прохождения тестов
	const sessionCounts = await db
		.select({
			userId: session.userId,
			testType: session.testType,
			count: sql<number>`count(*)`.as('count')
		})
		.from(session)
		.groupBy(session.userId, session.testType);

	// userId -> testType -> count
	const sessionsMap: Record<string, Record<string, number>> = {};

	for (const row of sessionCounts) {
		if (!sessionsMap[row.userId]) {
			sessionsMap[row.userId] = {};
		}

		sessionsMap[row.userId][row.testType] = row.count;
	}

	return rows.map((row) => {
		const survey = row.survey;

		const missingFields: string[] = [];

		if (survey) {
			for (const field of SURVEY_FIELDS) {
				if (survey[field] === null || survey[field] === undefined) {
					missingFields.push(field);
				}
			}
		} else {
			// если анкеты нет вообще
			missingFields.push(...SURVEY_FIELDS);
		}

		const tests = sessionsMap[row.userId] || {};

		return {
			id: row.userId,
			firstname: row.firstname,
			lastname: row.lastname,
			birthday: formatDate(row.birthday),
			sex: row.sex,

			// тесты
			math: tests.math || 0,
			stroop: tests.stroop || 0,
			munsterberg: tests.munsterberg || 0,
			memory: tests.memory || 0,
			swallow: tests.swallow || 0,
			campimetry: tests.campimetry || 0,

			// null-поля анкеты
			missingFields: missingFields.join(', ')
		};
	});
}
