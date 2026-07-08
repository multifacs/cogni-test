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
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		check(
			'gto_session_status_check',
			enumCheck(table.status, ['active', 'paused', 'completed'])
		),
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
		currentTestIndex: integer('current_test_index').notNull().default(0),
		wordScore: integer('word_score'),
		submittedWords: text('submitted_words'), // JSON array of words the participant typed
		wordSetId: text('word_set_id').references(() => gtoWordSet.id),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		unique('gto_session_participant_unique').on(table.gtoSessionId, table.userId),
		check('word_score_check', sql`${table.wordScore} >= 0 AND ${table.wordScore} <= 5`)
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
		buttonTestFileName: text('button_test_file_name'),
		logic: integer('logic'),
		wordSetNumber: integer('word_set_number')
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
		check('logic_check', sql`${table.logic} >= 0 AND ${table.logic} <= 1`),
		unique('gto_editable_metric_participant_id_unique').on(table.participantId)
	]
);

export const gtoWordSet = sqliteTable('gto_word_set', {
	id: text('id').primaryKey().$defaultFn(generate),
	setNumber: integer('set_number').notNull(),
	word1: text('word1').notNull(),
	word2: text('word2').notNull(),
	word3: text('word3').notNull(),
	word4: text('word4').notNull(),
	word5: text('word5').notNull(),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
