import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { session } from '../schema';
import { generate } from 'short-uuid';

export const attentionAttempt = sqliteTable('attention_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	n: integer('n').notNull(),
	m: integer('m').notNull(),
	errors: integer('errors').notNull(),
	elapsed: integer('elapsed').notNull(),
	found: integer('found').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const emojiAttempt = sqliteTable('emoji_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	score: integer('score').notNull(),
	mistakes: integer('mistakes').notNull(),
	totalAnswers: integer('total_answers').notNull(),
	accuracy: integer('accuracy').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const lettersAttempt = sqliteTable('letters_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	maxSpan: integer('max_span').notNull(),
	roundsCompleted: integer('rounds_completed').notNull(),
	elapsed: integer('elapsed').notNull(),
	timeoutTriggered: integer('time_limit', { mode: 'boolean' }).notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const flankerAttempt = sqliteTable('flanker_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	correctAnswers: integer('correct_answers').notNull(),
	totalTrials: integer('total_trials').notNull(),
	elapsedTime: integer('elapsed_time').notNull(),
	timeLimit: integer('time_limit', { mode: 'boolean' }).notNull(),
	avgRtCongruentMs: integer('avg_rt_congruent_ms').notNull(),
	avgRtIncongruentMs: integer('avg_rt_incongruent_ms').notNull(),
	flankerEffectMs: integer('flanker_effect_ms').notNull(),
	errors: integer('errors').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const numbersAttempt = sqliteTable('numbers_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	correct: integer('correct').notNull(),
	total: integer('total').notNull(),
	digitSpan: integer('digit_span').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const ravenAttempt = sqliteTable('raven_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	totalQuestions: integer('total_questions').notNull(),
	correctCount: integer('correct_count').notNull(),
	accuracy: integer('accuracy').notNull(),
	totalDurationMs: integer('total_duration_ms').notNull(),
	averageResponseTimeMs: integer('average_response_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const picturesAttempt = sqliteTable('pictures_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	score: integer('score').notNull(),
	maxScore: integer('max_score').notNull(),
	normalizedScore: integer('normalized_score').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const campimetryExerciseAttempt = sqliteTable('campimetry_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
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
});

export const ravenAnswer = sqliteTable('raven_answer', {
	id: text('id').primaryKey().$defaultFn(generate),
	taskId: text('task_id').notNull(),
	taskIndex: integer('task_index').notNull(),
	taskClass: text('task_class').notNull(),
	difficultyLevel: integer('difficulty_level').notNull(),
	difficultyScore: integer('difficulty_score').notNull(),
	rules: text('rules').notNull(),
	skillTags: text('skill_tags').notNull(),
	selectedIndex: integer('selected_index'),
	correctIndex: integer('correct_index').notNull(),
	selectedFamily: text('selected_family'),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	responseTimeMs: integer('response_time_ms').notNull(),
	seed: text('seed').notNull(),
	ravenAttemptId: text('raven_attempt_id')
		.notNull()
		.references(() => ravenAttempt.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
