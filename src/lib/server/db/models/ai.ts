import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { session, user } from '../schema';
import { generate } from 'short-uuid';

export const aiSurvey = sqliteTable('ai_survey', {
	id: text('id').primaryKey().$defaultFn(generate),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id),
	answers: text('answers').notNull(), // JSON blob
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: text('updated_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const classificationWordGroup = sqliteTable('classification_word_group', {
	id: text('id').primaryKey().$defaultFn(generate),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	groupIndex: integer('group_index').notNull(),
	words: text('words').notNull(), // JSON array
	feature: text('feature').notNull(),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const classificationRetelling = sqliteTable('classification_retelling', {
	id: text('id').primaryKey().$defaultFn(generate),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	text: text('text').notNull(),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export type InsertAiSurvey = typeof aiSurvey.$inferInsert;
export type SelectAiSurvey = typeof aiSurvey.$inferSelect;
export type InsertClassificationWordGroup = typeof classificationWordGroup.$inferInsert;
export type SelectClassificationWordGroup = typeof classificationWordGroup.$inferSelect;
export type InsertClassificationRetelling = typeof classificationRetelling.$inferInsert;
export type SelectClassificationRetelling = typeof classificationRetelling.$inferSelect;
