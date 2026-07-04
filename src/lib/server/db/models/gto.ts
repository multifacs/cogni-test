import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check, unique } from 'drizzle-orm/sqlite-core';
import { user, enumCheck } from '../schema';
import { generate } from 'short-uuid';

export const gtoSession = sqliteTable(
	'gto_session',
	{
		id: text('id').primaryKey().$defaultFn(generate),
		name: text('name').notNull(),
		type: text('type').notNull().default('cognitive-age'),
		status: text('status').notNull().default('active'),
		currentTestIndex: integer('current_test_index').notNull().default(0),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		check('gto_session_status_check', enumCheck(table.status, ['active', 'completed'])),
		check('gto_session_type_check', enumCheck(table.type, ['cognitive-age']))
	]
);

export const gtoSessionParticipant = sqliteTable(
	'gto_session_participant',
	{
		id: text('id').primaryKey().$defaultFn(generate),
		gtoSessionId: text('gto_session_id')
			.notNull()
			.references(() => gtoSession.id),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		hasCompletedTests: integer('has_completed_tests', { mode: 'boolean' })
			.notNull()
			.default(false),
		hasSubmittedWords: integer('has_submitted_words', { mode: 'boolean' })
			.notNull()
			.default(false),
		wordScore: integer('word_score'),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		unique('gto_session_participant_unique').on(table.gtoSessionId, table.userId),
		check('word_score_check', sql`${table.wordScore} >= 0 AND ${table.wordScore} <= 5`)
	]
);

export const gtoSessionWord = sqliteTable(
	'gto_session_word',
	{
		id: text('id').primaryKey().$defaultFn(generate),
		gtoSessionId: text('gto_session_id')
			.notNull()
			.references(() => gtoSession.id),
		word: text('word').notNull(),
		position: integer('position').notNull()
	},
	(table) => [
		check('position_check', sql`${table.position} >= 0 AND ${table.position} <= 4`)
	]
);

export const gtoEditableMetric = sqliteTable(
	'gto_editable_metric',
	{
		id: text('id').primaryKey().$defaultFn(generate),
		participantId: text('participant_id')
			.notNull()
			.references(() => gtoSessionParticipant.id),
		balanceTest: text('balance_test'),
		mazeQ1: integer('maze_q1'),
		mazeQ2: integer('maze_q2'),
		mazeQ3: integer('maze_q3'),
		mazeVRNumber: integer('maze_vr_number'),
		mazeVRFileName: text('maze_vr_file_name'),
		buttonTestNumber: integer('button_test_number'),
		buttonTestFileName: text('button_test_file_name')
	},
	(table) => [
		check(
			'balance_test_check',
			enumCheck(table.balanceTest, ['0-15', '15-30', '30-45', '45-60', '60+'])
		),
		check('maze_q1_check', sql`${table.mazeQ1} >= 0 AND ${table.mazeQ1} <= 1`),
		check('maze_q2_check', sql`${table.mazeQ2} >= 0 AND ${table.mazeQ2} <= 1`),
		check('maze_q3_check', sql`${table.mazeQ3} >= 0 AND ${table.mazeQ3} <= 1`),
		check(
			'button_test_number_check',
			sql`${table.buttonTestNumber} >= 0 AND ${table.buttonTestNumber} <= 20`
		),
		unique('gto_editable_metric_participant_id_unique').on(table.participantId)
	]
);
