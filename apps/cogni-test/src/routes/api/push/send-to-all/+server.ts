// src/routes/api/push/send-to-all/+server.js
import { json } from '@sveltejs/kit';
import { webpush } from '$lib/server/webpush.js';
import { PushSubscriptionService } from '$lib/server/pushSubscriptionService.js';
import type { RequestHandler } from './$types';

const subscriptionService = new PushSubscriptionService();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { title, body, icon, data } = await request.json();

		const subscriptions = await subscriptionService.getAllActiveSubscriptions();

		const payload = JSON.stringify({
			title,
			body,
			icon: icon || '/favicon.png',
			data
		});

		// Send to all subscriptions
		const sendPromises = subscriptions.map(async (subscription) => {
			try {
				await webpush.sendNotification(subscription, payload);
				return { success: true, endpoint: subscription.endpoint };
			} catch (error: any) {
				console.error('Failed to send to:', subscription.endpoint, error);

				// Handle expired subscriptions
				if (error.statusCode === 410 || error.statusCode === 404) {
					await subscriptionService.deactivateSubscription(subscription.endpoint);
				}

				return { success: false, endpoint: subscription.endpoint, error: error.message };
			}
		});

		const results = await Promise.all(sendPromises);
		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;

		return json({
			success: true,
			sent: successful,
			failed: failed,
			results
		});
	} catch (error) {
		console.error('Error sending notifications:', error);
		return json({ error: 'Failed to send notifications' }, { status: 500 });
	}
}
