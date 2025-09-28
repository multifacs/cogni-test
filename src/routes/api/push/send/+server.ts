// src/routes/api/push/send/+server.js
import { json } from '@sveltejs/kit';
import { webpush } from '$lib/server/webpush.js';

export async function POST({ request }) {
	try {
		const { subscription, payload } = await request.json();

		await webpush.sendNotification(subscription, JSON.stringify(payload));

		return json({ success: true });
	} catch (error) {
		console.error('Error sending notification:', error);
		return json({ error: 'Failed to send notification' }, { status: 500 });
	}
}
