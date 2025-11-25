// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version, prerendered } from '$service-worker';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

const precache_list = [...build, ...files, ...prerendered].map((s) => ({
	url: s,
	revision: version,
}));

cleanupOutdatedCaches();
precacheAndRoute(precache_list);

// Assets (build/files) - CacheFirst strategy
const ASSETS = new Set(build.concat(files).concat(prerendered));

registerRoute(
	({ url }) => ASSETS.has(url.pathname),
	new CacheFirst({
		cacheName: 'assets-cache',
	})
);

// Everything else - NetworkFirst with fallback to cache
registerRoute(
	({ request }) => request.method === 'GET' && !request.url.includes('chrome-extension:'),
	new NetworkFirst({
		cacheName: 'runtime-cache',
		plugins: [
			new CacheableResponsePlugin({
				statuses: [200],
			}),
		],
	})
);

self.addEventListener('push', (event) => {
	if (!event.data) {
		return;
	}

	const data = event.data.json();

	console.log('Push received:', data);

	const options = {
		body: data.body,
		icon: '/icon.png',
		badge: '/bell.svg',
		// STORE DYNAMIC DATA HERE - this is the key!
		data: {
			id: data.id,
			url: data.url || '/', // Dynamic URL from push payload
			path: data.path, // Alternative: just the path
			params: data.params // Query parameters as object
		},
		actions: [
			{
				action: 'view',
				title: 'Открыть'
				// icon: '/icons/eyes.svg'
			}
		],
		tag: 'notification-' + data.id,
		requireInteraction: false
	};

	event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
	console.log('Notification clicked:', event.notification.tag);

	// Close the notification
	event.notification.close();

	// DYNAMIC APPROACH 1: Use data passed from notification
	// Store the target URL in notification.data when creating it
	const targetUrl = event.notification.data?.url || '/';

	// Handle different actions
	if (event.action === 'view') {
		// User clicked the "View" action button
		event.waitUntil(clients.openWindow(targetUrl));
	} else if (event.action === 'dismiss') {
		// User clicked the "Dismiss" action button
		console.log('Notification dismissed');
	} else {
		// User clicked the notification body (not an action button)
		event.waitUntil(
			clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
				// Check if there's already a window open
				for (let client of clientList) {
					if (client.url.includes(targetUrl) && 'focus' in client) {
						return client.focus();
					}
				}
				// If no window is open, open a new one with dynamic URL
				if (clients.openWindow) {
					return clients.openWindow(targetUrl);
				}
			})
		);
	}
});

import localforage from 'localforage';
import { uploadResultsToDatabase } from './lib';

self.addEventListener('message', (event) => {
	// if (event.data?.type === 'CACHE_PAGES') {
	// 	cachePages(); 123
	// }

	if (event.data?.type === 'UPLOAD_RESULTS') {
		localforage.getItem('results-easy').then((r) => {
			console.log(r);
		});

		uploadResultsToDatabase();
	}
});
