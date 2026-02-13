import { db } from '$lib/server/db';
import { eq, getTableColumns } from 'drizzle-orm';
import { gtoMSessions, user } from '$lib/server/db/schema';
import { newGtoSession } from '$lib/gto-m';

import type { GtoProfile } from '$lib/gto-m/types';

export async function createGtoSession(userId: string, adminId: string, profile: GtoProfile) {
	const session = newGtoSession(userId, adminId, profile);
	const insertResult = await db
		.insert(gtoMSessions)
		.values(session)
		.returning({ sessionId: gtoMSessions.id });
	const sessionId = insertResult[0].sessionId;

	return sessionId;
}

export async function getGtoSessionsByUserId(userId: string) {
	const sessions = await db
		.select({
            adminName: user.firstname,
            adminSurname: user.lastname,
            ...getTableColumns(gtoMSessions)
        })
		.from(gtoMSessions)
		.innerJoin(user, eq(gtoMSessions.adminId, user.id))
		.where(eq(gtoMSessions.userId, userId));

	return sessions;
}
