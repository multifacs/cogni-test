import type { Handle } from '@sveltejs/kit';

// src/lib/server/notificationScheduler.ts
import { db } from '$lib/server/db';
import { scheduledPushNotifications, pushSubscriptions } from '$lib/server/db/schema';
import { webpush } from '$lib/server/webpush';
import { eq, and, lte } from 'drizzle-orm';
import { formatDateLog } from '$lib/utils';

declare global {
	var __notification_worker__: NodeJS.Timeout | null;
}

export async function processScheduledNotifications() {
	try {
		const now = new Date();

		// Get all scheduled notifications that are due
		const dueNotifications = await db
			.select()
			.from(scheduledPushNotifications)
			.where(lte(scheduledPushNotifications.scheduledFor, now));

		if (dueNotifications.length === 0) {
			return {
				success: true,
				message: 'No scheduled notifications due',
				processed: 0,
				sent: 0,
				failed: 0
			};
		}

		console.log(`Processing ${dueNotifications.length} scheduled notifications`);

		// Process each notification
		const results = await Promise.all(
			dueNotifications.map(async (notification) => {
				try {
					// Get the subscription for this notification
					const subscriptions = await db
						.select()
						.from(pushSubscriptions)
						.where(
							and(
								eq(pushSubscriptions.endpoint, notification.endpoint),
								eq(pushSubscriptions.isActive, true)
							)
						)
						.limit(1);

					if (subscriptions.length === 0) {
						console.error('No active subscription found for:', notification.endpoint);
						// Delete the notification to avoid retrying
						await db
							.delete(scheduledPushNotifications)
							.where(eq(scheduledPushNotifications.id, notification.id));

						return {
							success: false,
							notificationId: notification.id,
							error: 'Subscription not found or inactive'
						};
					}

					const subscription = subscriptions[0];

					// Parse the payload
					const payload = JSON.parse(notification.payload);

					// Construct the subscription object for web-push
					const pushSubscription = {
						endpoint: subscription.endpoint,
						keys: {
							p256dh: subscription.p256dh,
							auth: subscription.auth
						}
					};

					// Send the notification
					await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

					// Delete the notification after successful send
					await db
						.delete(scheduledPushNotifications)
						.where(eq(scheduledPushNotifications.id, notification.id));

					console.log(
						`Sent scheduled notification ${notification.id} to ${subscription.endpoint}`
					);

					return {
						success: true,
						notificationId: notification.id,
						endpoint: subscription.endpoint
					};
				} catch (error: any) {
					console.error('Failed to send scheduled notification:', notification.id, error);

					// Handle expired subscriptions
					if (error.statusCode === 410 || error.statusCode === 404) {
						await db
							.update(pushSubscriptions)
							.set({ isActive: false })
							.where(eq(pushSubscriptions.endpoint, notification.endpoint));

						// Delete the notification
						await db
							.delete(scheduledPushNotifications)
							.where(eq(scheduledPushNotifications.id, notification.id));
					}

					return {
						success: false,
						notificationId: notification.id,
						error: error.message
					};
				}
			})
		);

		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;

		return {
			success: true,
			processed: dueNotifications.length,
			sent: successful,
			failed: failed,
			results
		};
	} catch (error) {
		console.error('Error processing scheduled notifications:', error);
		return {
			success: false,
			error: 'Failed to process scheduled notifications'
		};
	}
}

// Store the interval ID for cleanup
let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

// Use globalThis to persist across HMR
const WORKER_KEY = '__notification_worker__';


// Worker function that runs every 3 seconds
function startWorker() {
	// Check if worker already exists globally
	if (globalThis[WORKER_KEY]) {
		console.log('Worker already running globally, restarting...');
		stopWorker()
	}

	// Fix for terminal input issues
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');

		process.stdin.on('data', (key) => {
			// Handle Ctrl+C
			if (key.toString() === '\u0003') {
				console.log('Ctrl+C pressed, shutting down...');
				if (workerInterval) {
					clearInterval(workerInterval);
				}
				process.exit(0);
			}
		});
	}

	if (workerInterval) {
		console.log('Worker already running');
		return;
	}

	console.log('Starting background worker...');

	workerInterval = setInterval(async () => {
		// Skip if previous execution is still running
		if (isProcessing) {
			console.log('[Worker] Previous run still processing, skipping...');
			return;
		}

		isProcessing = true;

		try {
			console.log(`[Worker] Running at ${formatDateLog(new Date())}`);
			await processScheduledNotifications();
		} catch (error) {
			console.error('[Worker] Error:', error);
		} finally {
			isProcessing = false;
		}
	}, 10000);

	// Store globally
	globalThis[WORKER_KEY] = workerInterval;
}

// Cleanup function
function stopWorker() {
	const interval = globalThis[WORKER_KEY] || workerInterval;

	if (interval) {
		clearInterval(interval);
		workerInterval = null;
		globalThis[WORKER_KEY] = null;
		console.log('Worker stopped');
	}
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received, stopping worker...');
	stopWorker();
});

process.on('SIGINT', () => {
	console.log('SIGINT received, stopping worker...');
	stopWorker();
});

// Start the worker when the server starts
startWorker();

// SvelteKit handle hook
export const handle: Handle = async ({ event, resolve }) => {
	// You can add request-specific logic here
	const response = await resolve(event);
	return response;
};
