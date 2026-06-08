import { pgTable, uuid, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

// Попытка прохождения теста (одна сессия = одна запись)
export const testAttempt = pgTable('test_attempt', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	testSlug: text('test_slug').notNull(), // 'stroop' | 'attention' | 'memory1' | 'memory2'
	startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	durationMs: integer('duration_ms'),
	score: integer('score'), // правильных
	maxScore: integer('max_score'), // всего возможных
	normalizedScore: integer('normalized_score'), // 0..100, сопоставимый между тестами
	meta: jsonb('meta') // конфиг + сводка теста (см. contracts.ts)
});

// Отдельный ответ внутри попытки
export const testAnswer = pgTable('test_answer', {
	id: uuid('id').primaryKey().defaultRandom(),
	attemptId: uuid('attempt_id')
		.notNull()
		.references(() => testAttempt.id, { onDelete: 'cascade' }),
	questionId: text('question_id').notNull(),
	answer: text('answer'),
	isCorrect: boolean('is_correct'),
	reactionTimeMs: integer('reaction_time_ms'), // время от показа стимула до ответа
	meta: jsonb('meta'), // произвольные детали ответа (например, исходная и введённая последовательность)
	answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow().notNull()
});

export type TestAttempt = typeof testAttempt.$inferSelect;
export type NewTestAttempt = typeof testAttempt.$inferInsert;
export type TestAnswer = typeof testAnswer.$inferSelect;
export type NewTestAnswer = typeof testAnswer.$inferInsert;
