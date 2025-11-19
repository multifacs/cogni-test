// lib/notifications.ts
import localforage from 'localforage';

export async function scheduleTestReminder(testSlug: string, delayMinutes: number = 10) {
	// Request notification permission
	if (Notification.permission === 'default') {
		await Notification.requestPermission();
	}

	if (Notification.permission !== 'granted') {
		return; // User denied
	}

	// Save to IndexedDB/localForage
	const reminder = {
		id: crypto.randomUUID(),
		testSlug,
		scheduledFor: Date.now() + delayMinutes * 1000,
		createdAt: Date.now()
	};

	await localforage.setItem(`reminder-${reminder.id}`, reminder);

	// Register background sync (for when tab is closed)
	if ('serviceWorker' in navigator) {
		const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration;
		if ('sync' in registration) {
			await registration.sync.register(`reminder-${reminder.id}`);
		}
	}

	// Also set a simple timer (for when tab is open)
	setTimeout(async () => {
		await showNotification(testSlug);
		await localforage.removeItem(`reminder-${reminder.id}`);
	}, delayMinutes * 1000);
}

async function showNotification(testSlug: string) {
	const registration = await navigator.serviceWorker.ready;

	registration.showNotification('Время для теста!', {
		body: `Пора завершить тест "${testSlug}"`,
		icon: '/icon.png',
		badge: '/badge.png',
		tag: `test-${testSlug}`,
		requireInteraction: true,
		actions: [
			{ action: 'open', title: 'Открыть тест' },
			{ action: 'dismiss', title: 'Позже' }
		]
	});
}

export async function requestNotificationPermissions() {
	// 1. Request notification permission

	const status = await navigator.permissions.query({
		name: 'periodic-background-sync'
	});
    console.log('Periodic Background Sync permission status:', status.state);

	if (Notification.permission === 'default') {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			return { notifications: false, periodicSync: false };
		}
	}

	// 2. Register service worker if needed
	if (!('serviceWorker' in navigator)) {
		return { notifications: true, periodicSync: false };
	}

	const registration = await navigator.serviceWorker.ready;

	// 3. Request Periodic Background Sync
	if ('periodicSync' in registration) {
		try {
			// Register periodic sync - this implicitly requests permission
			await registration.periodicSync.register('check-reminders', {
				minInterval: 60 * 1000 // 1 minute (browsers may enforce longer intervals)
			});

			return { notifications: true, periodicSync: true };
		} catch (error) {
			console.error('Periodic sync registration failed:', error);
			return { notifications: true, periodicSync: false };
		}
	}

	return { notifications: true, periodicSync: false };
}
