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
		tag: `test-${testSlug}`,
		requireInteraction: true
	});
}

