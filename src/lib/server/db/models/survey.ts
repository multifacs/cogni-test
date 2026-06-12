import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core';
// import short from 'short-uuid';
import { enumCheck } from '../schema';
import { user } from '../schema';

export const profileSurvey = sqliteTable(
	'profile_survey',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),

		// Tab 1: Основная информация
		birthCity: text('birth_city'), // населенный пункт, где прожили большую часть жизни
		currentCityType: text('current_city_type').$type<
			'capital' | 'municipality' | 'city' | 'town' | 'village'
		>(), // текущее место проживания

		// Tab 2: Образование и опыт работы
		education: text('education').$type<
			'none' | 'highschool' | 'associate' | 'vocational' | 'undergrad' | 'graduate' | 'phd'
		>(),
		yearsNotQualified: integer('years_not_qualified'), // 0-50: без квалификации
		yearsQualifiedApplied: integer('years_qualified_applied'), // 0-50: квалифицированный прикладной
		yearsQualifiedNonApplied: integer('years_qualified_non_applied'), // 0-50: квалифицированный неприкладной
		yearsProfessional: integer('years_professional'), // 0-50: профессиональная
		yearsHighResponsibility: integer('years_high_responsibility'), // 0-50: высокоответственная

		// Tab 3: Занятия и активности
		currentOccupation: text('current_occupation').$type<
			'student' | 'uni_student' | 'employed' | 'disabled' | 'homemaker' | 'retiree' | 'other'
		>(),
		jobPosition: text('job_position').$type<
			| 'business_owner'
			| 'executive'
			| 'middle_manager'
			| 'military'
			| 'law_enforcement'
			| 'teacher'
			| 'civil_servant'
			| 'healthcare'
			| 'creative_professional'
			| 'academic'
			| 'office_employee'
			| 'worker'
			| 'other_profession'
		>(),

		// Еженедельные активности
		weeklyReading: text('weekly_reading').$type<'never' | 'seldom' | 'often'>(),
		weeklyHousework: text('weekly_housework').$type<'never' | 'seldom' | 'often'>(),
		weeklyHobby: text('weekly_hobby').$type<'never' | 'seldom' | 'often'>(),
		weeklyTech: text('weekly_tech').$type<'never' | 'seldom' | 'often'>(),

		// Ежемесячные активности
		monthlySocial: text('monthly_social').$type<'never' | 'seldom' | 'often'>(),
		monthlyCulture: text('monthly_culture').$type<'never' | 'seldom' | 'often'>(),
		monthlyGardening: text('monthly_gardening').$type<'never' | 'seldom' | 'often'>(),
		monthlyCaring: text('monthly_caring').$type<'never' | 'seldom' | 'often'>(),
		monthlyVolunteer: text('monthly_volunteer').$type<'never' | 'seldom' | 'often'>(),
		monthlyArtistic: text('monthly_artistic').$type<'never' | 'seldom' | 'often'>(),

		// Ежегодные активности
		yearlyEvents: text('yearly_events').$type<'never' | 'seldom' | 'often'>(),
		yearlyTravel: text('yearly_travel').$type<'never' | 'seldom' | 'often'>(),
		yearlyBookReading: text('yearly_book_reading').$type<'never' | 'seldom' | 'often'>(),

		// Tab 4: Физические характеристики и привычки
		height: integer('height'), // 0-250 см
		weight: integer('weight'), // 0-250 кг
		dominantHand: text('dominant_hand').$type<'left' | 'right'>(),
		isAmbidextrous: integer('is_ambidextrous', { mode: 'boolean' }),
		chronicDiseases: text('chronic_diseases'),
		smoking: text('smoking').$type<'no' | 'yes' | 'usedTo'>(),
		alcohol: text('alcohol').$type<'no' | 'yes'>(),
		// sportsFrequency: text('sports_frequency').$type<
		// 	'everyday' | 'week5' | 'week3' | 'week1' | 'biweekly' | 'montly'
		// >(),
		sports: text('sports'),
		isGamer: integer('is_gamer', { mode: 'boolean' }),

		// Metadata
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: text('updated_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		// Current city type check
		check(
			'current_city_type_check',
			enumCheck(table.currentCityType, ['capital', 'municipality', 'city', 'town', 'village'])
		),

		// Education check
		check(
			'education_check',
			enumCheck(table.education, [
				'none',
				'highschool',
				'associate',
				'vocational',
				'undergrad',
				'graduate',
				'phd'
			])
		),

		// Years range checks (0-50)
		check(
			'years_not_qualified_check',
			sql`${table.yearsNotQualified} >= 0 AND ${table.yearsNotQualified} <= 50`
		),
		check(
			'years_qualified_applied_check',
			sql`${table.yearsQualifiedApplied} >= 0 AND ${table.yearsQualifiedApplied} <= 50`
		),
		check(
			'years_qualified_non_applied_check',
			sql`${table.yearsQualifiedNonApplied} >= 0 AND ${table.yearsQualifiedNonApplied} <= 50`
		),
		check(
			'years_professional_check',
			sql`${table.yearsProfessional} >= 0 AND ${table.yearsProfessional} <= 50`
		),
		check(
			'years_high_responsibility_check',
			sql`${table.yearsHighResponsibility} >= 0 AND ${table.yearsHighResponsibility} <= 50`
		),

		// Current occupation check
		check(
			'current_occupation_check',
			enumCheck(table.currentOccupation, [
				'student',
				'uni_student',
				'employed',
				'disabled',
				'homemaker',
				'retiree',
				'other'
			])
		),

		// Job position check
		check(
			'job_position_check',
			enumCheck(table.jobPosition, [
				'business_owner',
				'executive',
				'middle_manager',
				'military',
				'law_enforcement',
				'teacher',
				'civil_servant',
				'healthcare',
				'creative_professional',
				'academic',
				'office_employee',
				'worker',
				'other_profession'
			])
		),

		// Frequency checks (weekly, monthly, yearly)
		check('weekly_reading_check', enumCheck(table.weeklyReading, ['never', 'seldom', 'often'])),
		check(
			'weekly_housework_check',
			enumCheck(table.weeklyHousework, ['never', 'seldom', 'often'])
		),
		check('weekly_hobby_check', enumCheck(table.weeklyHobby, ['never', 'seldom', 'often'])),
		check('weekly_tech_check', enumCheck(table.weeklyTech, ['never', 'seldom', 'often'])),

		check('monthly_social_check', enumCheck(table.monthlySocial, ['never', 'seldom', 'often'])),
		check(
			'monthly_culture_check',
			enumCheck(table.monthlyCulture, ['never', 'seldom', 'often'])
		),
		check(
			'monthly_gardening_check',
			enumCheck(table.monthlyGardening, ['never', 'seldom', 'often'])
		),
		check('monthly_caring_check', enumCheck(table.monthlyCaring, ['never', 'seldom', 'often'])),
		check(
			'monthly_volunteer_check',
			enumCheck(table.monthlyVolunteer, ['never', 'seldom', 'often'])
		),
		check(
			'monthly_artistic_check',
			enumCheck(table.monthlyArtistic, ['never', 'seldom', 'often'])
		),

		check('yearly_events_check', enumCheck(table.yearlyEvents, ['never', 'seldom', 'often'])),
		check('yearly_travel_check', enumCheck(table.yearlyTravel, ['never', 'seldom', 'often'])),
		check(
			'yearly_book_reading_check',
			enumCheck(table.yearlyBookReading, ['never', 'seldom', 'often'])
		),

		// Physical checks
		check('height_check', sql`${table.height} >= 0 AND ${table.height} <= 250`),
		check('weight_check', sql`${table.weight} >= 0 AND ${table.weight} <= 250`),
		check('dominant_hand_check', enumCheck(table.dominantHand, ['left', 'right'])),

		// Habits checks
		check('smoking_check', enumCheck(table.smoking, ['no', 'yes', 'usedTo'])),
		check('alcohol_check', enumCheck(table.alcohol, ['no', 'yes']))
		// check(
		// 	'sports_frequency_check',
		// 	enumCheck(table.sportsFrequency, [
		// 		'everyday',
		// 		'week5',
		// 		'week3',
		// 		'week1',
		// 		'biweekly',
		// 		'montly'
		// 	])
		// )
	]
);

// Export types
export type Sex = 'male' | 'female';
export type CurrentCityType = 'capital' | 'municipality' | 'city' | 'town' | 'village';
export type EducationLevel =
	| 'none'
	| 'highschool'
	| 'associate'
	| 'vocational'
	| 'undergrad'
	| 'graduate'
	| 'phd';
export type Occupation =
	| 'student'
	| 'uni_student'
	| 'employed'
	| 'disabled'
	| 'homemaker'
	| 'retiree'
	| 'other';
export type JobPosition =
	| 'business_owner'
	| 'executive'
	| 'middle_manager'
	| 'military'
	| 'law_enforcement'
	| 'teacher'
	| 'civil_servant'
	| 'healthcare'
	| 'creative_professional'
	| 'academic'
	| 'office_employee'
	| 'worker'
	| 'other_profession';
export type Frequency = 'never' | 'seldom' | 'often';
export type DominantHand = 'left' | 'right';
export type Smoking = 'no' | 'yes' | 'usedTo';
export type Alcohol = 'no' | 'yes';
// export type SportsFrequency = 'everyday' | 'week5' | 'week3' | 'week1' | 'biweekly' | 'montly';

export type InsertProfileSurvey = typeof profileSurvey.$inferInsert;
export type SelectProfileSurvey = typeof profileSurvey.$inferSelect;
