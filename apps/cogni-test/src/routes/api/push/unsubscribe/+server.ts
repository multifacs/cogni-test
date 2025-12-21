// src/routes/api/push/unsubscribe/+server.js
import { json } from '@sveltejs/kit';
import { PushSubscriptionService } from '$lib/server/pushSubscriptionService.js';
import type { RequestHandler } from './$types';

const subscriptionService = new PushSubscriptionService();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { endpoint } = await request.json();

		await subscriptionService.removeSubscription(endpoint);

		return json({ success: true });
	} catch (error) {
		console.error('Error handling unsubscription:', error);
		return json({ error: 'Failed to unsubscribe' }, { status: 500 });
	}
}
