import { db } from '$lib/server/db';
import { eq, and, getTableColumns } from 'drizzle-orm';
import { userAdmins, user } from '$lib/server/db/schema';

/**
 * @throws {Error} if failed to create user admin
 */
export async function createUserAdmin(patientId: string, adminId: string) {
	try {
		const [existing] = await db
			.select()
			.from(userAdmins)
			.where(and(eq(userAdmins.userId, patientId), eq(userAdmins.adminId, adminId)));

		if (existing) {
			return;
		}

		await db.insert(userAdmins).values({ userId: patientId, adminId: adminId });
	} catch (error) {
		throw new Error(
			`Failed to create user admin: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * @throws {Error} if failed to get users by admin id
 */
export async function getUsersByAdminId(adminId: string) {
	try {
		const users = await db
			.select({
				...getTableColumns(user)
			})
			.from(userAdmins)
			.innerJoin(user, eq(userAdmins.userId, user.id))
			.where(eq(userAdmins.adminId, adminId));

		return users;
	} catch (error) {
		throw new Error(
			`Failed to get users by admin id: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
