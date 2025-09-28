// src/lib/pushService.js
import { browser } from '$app/environment';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

export class PushService {
	constructor() {
		this.vapidPublicKey = PUBLIC_VAPID_KEY;
	}

	async registerServiceWorker() {
		if (!browser || !('serviceWorker' in navigator)) {
			throw new Error('Service workers not supported');
		}

		const registration = await navigator.serviceWorker.register('/sw.js');
		return registration;
	}

	async requestPermission() {
		if (!browser || !('Notification' in window)) {
			throw new Error('Notifications not supported');
		}

		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			throw new Error('Permission denied');
		}
		return permission;
	}

	urlBase64ToUint8Array(base64String) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}

	async subscribe() {
		const registration = await this.registerServiceWorker();
		await this.requestPermission();

		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
		});

		// Send subscription to server
		await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(subscription)
		});

		return subscription;
	}

	async unsubscribe() {
		if (!browser) return;

		const registration = await navigator.serviceWorker.getRegistration();
		if (registration) {
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				// Notify server before unsubscribing
				await fetch('/api/push/unsubscribe', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ endpoint: subscription.endpoint })
				});

				await subscription.unsubscribe();
			}
		}
	}

	async getSubscription() {
		if (!browser) return null;

		const registration = await navigator.serviceWorker.getRegistration();
		if (registration) {
			return await registration.pushManager.getSubscription();
		}
		return null;
	}
}
