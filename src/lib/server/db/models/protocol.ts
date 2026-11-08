import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { generate } from 'short-uuid';
import { session } from '../schema';
import type { ProtocolTrial } from '$lib/exercises/protocol/types';
// Full per-trial snapshots include ordered board/round events in validated JSON.
export const protocolTrial = sqliteTable(
	'protocol_trial',
	{
		id: text('id').primaryKey().$defaultFn(generate),
		sessionId: text('session_id')
			.notNull()
			.references(() => session.id, { onDelete: 'cascade' }),
		trialIndex: integer('trial_index').notNull(),
		data: text('data', { mode: 'json' }).$type<ProtocolTrial>().notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`)
	},
	(table) => [uniqueIndex('protocol_trial_session_index').on(table.sessionId, table.trialIndex)]
);
