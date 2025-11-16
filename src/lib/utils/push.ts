import { pushService } from '$lib/pushService';

type PushPayload = {
    title: string;
    body: string;
    icon: string;
};

export async function sendNotification(payload: PushPayload) {
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
                payload
            })
        });
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
}

export async function isSubscribed() {
    const subscription = await pushService.getSubscription();

    return !!subscription;
}
