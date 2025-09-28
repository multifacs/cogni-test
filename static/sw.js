// static/sw.js
self.addEventListener('push', (event) => {
	if (event.data) {
		const data = event.data.json();

		const options = {
			body: data.body,
			icon: data.icon || '/favicon.png',
			badge: data.badge || '/favicon.png',
			vibrate: [100, 50, 100],
			data: {
				dateOfArrival: Date.now(),
				primaryKey: '1',
				...data.data
			},
			actions: [
				{
					action: 'explore',
					title: 'Explore',
					icon: '/favicon.png'
				},
				{
					action: 'close',
					title: 'Close',
					icon: '/favicon.png'
				}
			]
		};

		event.waitUntil(self.registration.showNotification(data.title, options));
	}
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	if (event.action === 'explore') {
		// Handle explore action
		event.waitUntil(clients.openWindow('/'));
	} else if (event.action === 'close') {
		// Notification closed
	} else {
		// Default click action
		event.waitUntil(clients.openWindow('/'));
	}
});
