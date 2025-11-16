// Взято из доков svelte-kit https://svelte.dev/docs/kit/service-workers

// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals

/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Так-то может пригодиться для кэширования, но сейчас только ради
// того, чтобы на меня не ругался lsp (я хз почему это так работает)
import { build, files, version } from '$service-worker';

// This gives `self` the correct types
const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

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
		event.waitUntil(self.clients.openWindow('/'));
	} else if (event.action === 'close') {
		// Notification closed
	} else {
		// Default click action
		event.waitUntil(self.clients.openWindow('/'));
	}
});
