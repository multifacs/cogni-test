import webpush from 'web-push';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { pushSubscriptions } from '../src/lib/server/db/pushSubscriptions.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

// Set VAPID details from environment variables
webpush.setVapidDetails(
	process.env.PUBLIC_VAPID_SUBJECT,
	process.env.PUBLIC_VAPID_KEY,
	process.env.PRIVATE_VAPID_KEY
);

const client = createClient({ url: process.env.DATABASE_URL });
const db = drizzle(client);

export async function sendPush(job) {
	try {
		// Parse the payload (stored as JSON string)
		const notificationPayload = JSON.parse(job.payload);

		// Fetch subscription from database using endpoint
		const subscriptions = await db
			.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.endpoint, job.endpoint))
			.limit(1);

		if (subscriptions.length === 0) {
			throw new Error(`No subscription found for endpoint: ${job.endpoint}`);
		}

		const subscription = subscriptions[0];

		// Reconstruct subscription object for web-push
		const pushSubscription = {
			endpoint: subscription.endpoint,
			keys: {
				p256dh: subscription.p256dh,
				auth: subscription.auth
			}
		};

		const pushPayload = JSON.stringify({
			title: notificationPayload.title,
			body: notificationPayload.body + " WEB PUSH API",
			icon: notificationPayload.icon || '/icon.png',
			data: {
				url: 'https://cogni-test.ru'
			}
		});

		await webpush.sendNotification(pushSubscription, pushPayload);
		console.log(`Push notification sent to endpoint: ${job.endpoint}`);
	} catch (error) {
		console.error(`Failed to send push to endpoint ${job.endpoint}:`, error);
		
		// Handle expired subscriptions (410 Gone, 404 Not Found)
		if (error.statusCode === 410 || error.statusCode === 404) {
			console.log(`Subscription expired for endpoint: ${job.endpoint}`);
			// Deactivate the subscription
			await db
				.update(pushSubscriptions)
				.set({ isActive: false })
				.where(eq(pushSubscriptions.endpoint, job.endpoint));
		}
		
		throw error;
	}
}


