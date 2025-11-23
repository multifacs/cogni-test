// src/routes/api/push/send/+server.js
import { json } from '@sveltejs/kit';
import { webpush } from '$lib/server/webpush.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { subscription, payload, delay: delayInSeconds = 0 } = await request.json();

		setTimeout(async () => {
			await webpush.sendNotification(subscription, JSON.stringify(payload));
		}, delayInSeconds * 1000);

		return json({ success: true });
	} catch (error) {
		console.error('Error sending notification:', error);
		return json({ error: 'Failed to send notification' }, { status: 500 });
	}
};
