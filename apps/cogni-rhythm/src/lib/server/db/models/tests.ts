import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core';
import { session, enumCheck } from '../schema';
import short from 'short-uuid';

const CAMPIMETRY_COLORS = [
	'black',
	'white',
	'dark-magenta',
	'light-magenta',
	'dark-blue',
	'light-blue',
	'dark-green',
	'light-green',
	'dark-red',
	'light-red'
];

export const campimetryAttempt = sqliteTable(
	'campimetry_attempt',
	{
		id: text('id').primaryKey().$defaultFn(short.generate),
		attempt: integer('attempt').notNull(),
		stage: integer('stage').notNull(),
		silhouette: text('silhouette').notNull(),
		channel: text('channel').notNull(),
		op: text('op').notNull(),
		color: text('color').notNull(),
		delta: integer('delta').notNull(),
		time: integer('time').notNull(),
		sessionId: text('session_id')
			.notNull()
			.references(() => session.id),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		check('channel_check', enumCheck(table.channel, ['a', 'b'])),
		check('op_check', enumCheck(table.op, ['+', '-'])),
		check('color_check', enumCheck(table.color, CAMPIMETRY_COLORS))
	]
);

export const mathAttempt = sqliteTable(
	'math_attempt',
	{
		id: text('id').primaryKey().$defaultFn(short.generate),
		attempt: integer('attempt').notNull(),
		stage: integer('stage').notNull(),
		time: integer('time').notNull(),
		left: text('left').notNull(),
		sign: text('sign').notNull(),
		right: text('right').notNull(),
		correctAnswer: integer('correct_answer', { mode: 'boolean' }).notNull(),
		userAnswer: integer('user_answer', { mode: 'boolean' }),
		isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
		sessionId: text('session_id')
			.notNull()
			.references(() => session.id),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [check('sign_check', enumCheck(table.sign, ['>', '<', '>=', '<=', '=', '!=']))]
);

export const memoryAttempt = sqliteTable('memory_attempt', {
	id: text('id').primaryKey().$defaultFn(short.generate),
	attempt: integer('attempt').notNull(),
	time: integer('time').notNull(),
	word: text('word').notNull(),
	correctAnswer: integer('correct_answer', { mode: 'boolean' }).notNull(),
	userAnswer: integer('user_answer', { mode: 'boolean' }),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const munsterbergAttempt = sqliteTable('munsterberg_attempt', {
	id: text('id').primaryKey().notNull().$defaultFn(short.generate),
	word: text('word').notNull(),
	row: integer('row').notNull(),
	col: integer('col').notNull(),
	guessed: integer('guessed', { mode: 'boolean' }).notNull(),
	attempt: integer('attempt').notNull(),
	time: integer('time').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const stroopAttempt = sqliteTable(
	'stroop_attempt',
	{
		id: text('id').primaryKey().notNull().$defaultFn(short.generate),
		stage: integer('stage').notNull(),
		attempt: integer('attempt').notNull(),
		time: integer('time').notNull(),
		word: text('word').notNull(),
		color: text('color').notNull(),
		task: text('task').notNull(),
		userAnswer: text('user_answer'), // Цвет в виде строки, null возможен
		isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
		sessionId: text('session_id')
			.notNull()
			.references(() => session.id),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		check(
			'color_check',
			enumCheck(table.color, ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'])
		),
		check('task_check', enumCheck(table.task, ['both', 'meaning', 'color']))
	]
);

const DIRECTION_VALUES = ['up', 'right', 'down', 'left'];
const BACKGROUND_VALUES = ['red', 'blue'];

export const swallowAttempt = sqliteTable(
	'swallow_attempt',
	{
		id: text('id').primaryKey().notNull().$defaultFn(short.generate),
		attempt: integer('attempt').notNull(),
		time: integer('time').notNull(),
		direction: text('direction').notNull(),
		background: text('background').notNull(),
		correctAnswer: text('correct_answer').notNull(),
		userAnswer: text('user_answer'),
		isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false),
		sessionId: text('session_id')
			.notNull()
			.references(() => session.id),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [
		check('direction_check', enumCheck(table.direction, DIRECTION_VALUES)),
		check('background_check', enumCheck(table.background, BACKGROUND_VALUES)),
		check('correct_answer_check', enumCheck(table.correctAnswer, DIRECTION_VALUES)),
		check('user_answer_check', enumCheck(table.userAnswer, DIRECTION_VALUES)) // nullable
	]
);

export const rhythmAttempt = sqliteTable('rhythm_attempt', {
	id: text('id').primaryKey().notNull().$defaultFn(short.generate),
	attempt: integer('attempt').notNull(),
	note: integer('note').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const memoryMatchAttempt = sqliteTable('memory_match_attempt', {
	id: text('id').primaryKey().$defaultFn(short.generate),
	attempt: integer('attempt').notNull(), // 1..3
	time: integer('time').notNull(), // durationMs
	stage: integer('stage').notNull(), // дубль attempt
	cards: integer('cards').notNull(), // rows*cols
	flips: integer('flips').notNull(), // flipsCount
	mistakes: integer('mistakes').notNull(), // mistakes
	efficiency: integer('efficiency').notNull(), // flips/cards * 1000 (см. ниже)
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(true),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
