import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check, primaryKey } from 'drizzle-orm/sqlite-core';
import short from 'short-uuid';
export * from './models/tests';

import type { GtoProfile } from '$lib/gto-m/types';

export function enumCheck(column: any, values: string[]) {
	const joined = values.map((v) => `'${v}'`).join(', ');
	return sql`${column} in (${sql.raw(joined)})`;
}

export const user = sqliteTable(
	'user',
	{
		id: text('id').primaryKey().$defaultFn(short.generate),
		firstname: text('first_name').notNull(),
		lastname: text('last_name').notNull(),
		birthday: integer('birthday', { mode: 'timestamp' }).notNull(),
		sex: text('sex').$type<'male' | 'female'>().notNull(),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [check('sex_check', enumCheck(table.sex, ['male', 'female']))]
);

// TODO: maybe should not have this much info about admins (why the fuck am I even copying this from user table???)
export const admins = sqliteTable(
	'admins',
	{
		id: text('id').primaryKey().$defaultFn(short.generate),
		// password: text('password').notNull(), // TODO: figure out registation and hashing
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
);

export const userAdmins = sqliteTable(
	'user_admins',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		adminId: text('admin_id')
			.notNull()
			.references(() => admins.id)
	},
	(table) => [primaryKey({ columns: [table.userId, table.adminId] })]
);

export const session = sqliteTable('session', {
	id: text('id').primaryKey().$defaultFn(short.generate),
	testType: text('test_type').notNull(),
	meta: text('meta'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
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

export const gtoMSessions = sqliteTable('gto_m_sessions', {
	id: text('id').primaryKey().$defaultFn(short.generate),
	profile: text('profile').notNull().$type<GtoProfile>(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	adminId: text('admin_id')
		.notNull()
		.references(() => user.id),
	tests: text('tests', { mode: 'json' }).$type<string[]>().notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
