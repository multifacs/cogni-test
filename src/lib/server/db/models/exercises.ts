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
