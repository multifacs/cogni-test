// src/routes/api/push/subscribe/+server.js
import { json } from '@sveltejs/kit';
import { webpush } from '$lib/server/webpush.js';
import { PushSubscriptionService } from '$lib/server/pushSubscriptionService.js';

const subscriptionService = new PushSubscriptionService();

export async function POST({ request, cookies }) {
	try {
		const subscription = await request.json();
		const userAgent = request.headers.get('user-agent');
		const userId = cookies.get('user_id'); // Get user_id from cookies

		// Save subscription to database
		const subscriptionId = await subscriptionService.saveSubscription(
			subscription,
			userId, // userId
			userAgent
		);

		// Send welcome notification
		const payload = JSON.stringify({
			title: 'Welcome!',
			body: 'You have successfully subscribed to notifications.',
			icon: '/favicon.png',
			badge: '/favicon.png',
			data: {
				subscriptionId
			}
		});

		await webpush.sendNotification(subscription, payload);

		return json({ success: true, subscriptionId });
	} catch (error) {
		console.error('Error handling subscription:', error);
		return json({ error: 'Failed to subscribe' }, { status: 500 });
	}
}
