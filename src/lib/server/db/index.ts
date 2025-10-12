export * from './controllers/user';

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

export const db = env.DATABASE_URL
	? drizzle(createClient({ url: env.DATABASE_URL }), { schema })
	: null;