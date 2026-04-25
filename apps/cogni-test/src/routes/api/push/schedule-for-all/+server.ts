import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scheduledPushNotifications } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';
import { PushSubscriptionService } from '$lib/server/pushSubscriptionService';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { payload, scheduledFor } = await request.json();
		const userId = cookies.get('user_id');
        console.log(userId);

        const subscriptionService = new PushSubscriptionService();
		const subscriptions = await subscriptionService.getAllActiveSubscriptions();
		if (subscriptions.length === 0) {
			return json({ error: 'No active subscription found for this endpoint' }, { status: 400 });
		}

        for (const subscription of subscriptions) {
            // Store subscription keys in payload for the notifier
            const payloadWithKeys = {
                ...payload,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
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
            console.log(result);
        }
		return json({ success: true });
	} catch (error) {
		console.error('Error scheduling notification:', error);
		return json({ error: 'Failed to schedule notification' }, { status: 500 });
	}
};

