// src/routes/api/push/unsubscribe/+server.js
import { json } from '@sveltejs/kit';
import { PushSubscriptionService } from '$lib/server/pushSubscriptionService.js';

const subscriptionService = new PushSubscriptionService();

export async function POST({ request }) {
	try {
		const { endpoint } = await request.json();

		await subscriptionService.removeSubscription(endpoint);

		return json({ success: true });
	} catch (error) {
		console.error('Error handling unsubscription:', error);
		return json({ error: 'Failed to unsubscribe' }, { status: 500 });
	}
}
