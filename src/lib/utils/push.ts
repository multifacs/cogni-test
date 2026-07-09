import { pushService } from '$lib/pushService';

export type PushPayload = {
	title: string;
	body: string;
	icon: string;
};

export async function sendNotification(payload: PushPayload, delayInSeconds = 0) {
	const subscription = await pushService.getSubscription();

	if (!subscription) {
		console.error('No subscription found');
		return;
	}

	try {
		await fetch('/api/push/send', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				subscription,
				payload,
				delay: delayInSeconds
			})
		});
	} catch (error) {
		console.error('Failed to send notification:', error);
	}
}

export async function sendNotificationToAll(payload: {
	title: string;
	body: string;
	icon: string;
}) {
	try {
		await fetch('/api/push/send-to-all', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				...payload
			})
		});
	} catch (error) {
		console.error('Failed to send notification:', error);
	}
}

export async function scheduleNotificationToAll(
	payload: {
		title: string;
		body: string;
		icon: string;
	},
	scheduledFor: number
) {
	try {
		let res = await fetch('/api/push/schedule-for-all', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				payload,
				scheduledFor
			})
		});

		if (res.status !== 200) {
			throw new Error('Failed to schedule notification');
		} else {
			console.log('Scheduled notification to all users');
		}
	} catch (error) {
		console.error('Failed to schedule notification:', error);
	}
}

export async function isSubscribed() {
	const subscription = await pushService.getSubscription();

	return !!subscription;
}
