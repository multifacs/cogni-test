import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core';
import { gtoSession } from './models/gto';
import { generate } from 'short-uuid';

export function enumCheck(column: any, values: string[]) {
	const joined = values.map((v) => `'${v}'`).join(', ');
	return sql`${column} in (${sql.raw(joined)})`;
}

export const user = sqliteTable(
	'user',
	{
		id: text('id').primaryKey().$defaultFn(generate),
		firstname: text('first_name').notNull(),
		lastname: text('last_name').notNull(),
		birthday: integer('birthday', { mode: 'timestamp' }).notNull(),
		sex: text('sex').$type<'male' | 'female'>().notNull(),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		lastActiveAt: text('last_active_at')
	},
	(table) => [
		check('sex_check', enumCheck(table.sex, ['male', 'female'])),
		check('lastname_length', sql`length(${table.lastname}) = 2`)
	]
);

export const session = sqliteTable('session', {
	id: text('id').primaryKey().$defaultFn(generate),
	testType: text('test_type').notNull(),
	meta: text('meta'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	gtoSessionId: text('gto_session_id').references(() => gtoSession.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

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

export const pushSubscriptions = sqliteTable('push_subscriptions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id'), // Optional: link to user accounts
	endpoint: text('endpoint').notNull(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	userAgent: text('user_agent'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

export * from './models/tests';
export * from './models/survey';
export * from './models/exercises';
export * from './models/gto';
