import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const scheduledPushNotifications = sqliteTable('scheduled_push_notifications', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id'),
	endpoint: text('endpoint').notNull(),
	payload: text('payload').notNull(), // JSON string
	scheduledFor: integer('scheduled_for', { mode: 'timestamp' }).notNull(), // Unix timestamp in milliseconds
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

