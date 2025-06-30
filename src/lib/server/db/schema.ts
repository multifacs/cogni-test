import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: integer('id').primaryKey(),
	age: integer('age'),
	length: integer('length')
});

export const session = sqliteTable('session', {
	id: integer('id').primaryKey(),
	name: text('name')
});
