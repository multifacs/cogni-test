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
