import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core';
import short from 'short-uuid';
export * from './models/tests';

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
		sex: text('sex').notNull(),
		createdAt: text('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull()
	},
	(table) => [check('sex_check', enumCheck(table.sex, ['male', 'female']))]
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

export { pushSubscriptions } from './pushSubscriptions';
export { scheduledPushNotifications } from './scheduledPushNotifications';