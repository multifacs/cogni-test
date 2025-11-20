import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { scheduledPushNotifications } from '../src/lib/server/db/scheduledPushNotifications.ts';
import { lte, eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({ url: process.env.DATABASE_URL });
const db = drizzle(client);

export async function getPendingJobs(currentTime) {
	try {
		// Convert timestamp (number) to Date object for Drizzle
		const currentDate = new Date(currentTime);
		
		const jobs = await db
			.select()
			.from(scheduledPushNotifications)
			.where(lte(scheduledPushNotifications.scheduledFor, currentDate));

		return jobs;
	} catch (error) {
		console.error('Error getting pending jobs:', error);
		return [];
	}
}

export async function markJobSent(jobId) {
	try {
		await db.delete(scheduledPushNotifications).where(
			eq(scheduledPushNotifications.id, jobId)
		);
	} catch (error) {
		console.error('Error marking job as sent:', error);
		throw error;
	}
}

export default {
	getPendingJobs,
	markJobSent
};

