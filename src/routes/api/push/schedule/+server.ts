import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scheduledPushNotifications } from '$lib/server/db/schema';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { endpoint, payload, scheduledFor } = await request.json();
		const userId = cookies.get('user_id');

		if (!endpoint) {
			return json({ error: 'Endpoint is required' }, { status: 400 });
		}

		// Get subscription by endpoint (more reliable than userId)
		const subscriptions = await db
			.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.endpoint, endpoint))
			.limit(1);

		if (subscriptions.length === 0) {
			return json({ error: 'No active subscription found for this endpoint' }, { status: 400 });
		}

		const subscription = subscriptions[0];

		// Check if subscription is active
		if (!subscription.isActive) {
			return json({ error: 'Subscription is not active' }, { status: 400 });
		}

		// Store subscription keys in payload for the notifier
		const payloadWithKeys = {
			...payload,
			p256dh: subscription.p256dh,
			auth: subscription.auth
		};

		// Create scheduled notification
		const result = await db
			.insert(scheduledPushNotifications)
			.values({
				userId: subscription.userId || userId,
				endpoint: subscription.endpoint,
				payload: JSON.stringify(payloadWithKeys),
				scheduledFor: new Date(scheduledFor),
				createdAt: new Date()
			})
			.returning({ id: scheduledPushNotifications.id });

		return json({ success: true, id: result[0].id });
	} catch (error) {
		console.error('Error scheduling notification:', error);
		return json({ error: 'Failed to schedule notification' }, { status: 500 });
	}
};

