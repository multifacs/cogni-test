// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version } from '$service-worker';

// import localforage from 'localforage';
// console.log(await localforage.getItem('TG_GROUP_LINK'));

// This gives `self` the correct types
const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker version:', version);

	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	// Filter out chrome-extension protocol requests
	if (event.request.url.includes('chrome-extension:')) {
		// Option 1: Let the request proceed normally
		console.log('[SW] Ignoring chrome-extension request:', event.request.url);
		return;
	}

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			// if there's no cache, then just error out
			// as there is nothing we can do to respond to this request
			throw err;
		}
	}

	event.respondWith(respond());
});

import localforage from 'localforage';

self.addEventListener('periodicsync', async (event) => {
	if (event.tag === 'check-reminders') {
		event.waitUntil(checkAllReminders());
	}
});

async function checkAllReminders() {
	const keys = await localforage.keys();
	const reminderKeys = keys.filter((k) => k.startsWith('reminder-'));

	await self.registration.showNotification('Время для теста!', {
		body: `Пора завершить тест`,
		requireInteraction: true
	});

	// for (const key of reminderKeys) {
	// 	const reminder = await localforage.getItem(key);
	// 	if (reminder && Date.now() >= reminder.scheduledFor) {
	// 		await self.registration.showNotification('Время для теста!', {
	// 			body: `Пора завершить тест "${reminder.testSlug}"`,
	// 			icon: '/icon.png',
	// 			requireInteraction: true
	// 		});
	// 		await localforage.removeItem(key);
	// 	}
	// }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	if (event.action === 'open') {
		// const testSlug = event.notification.tag.replace('test-', '');
		event.waitUntil(clients.openWindow(`/tests/stroop/playground`));
	}
});
