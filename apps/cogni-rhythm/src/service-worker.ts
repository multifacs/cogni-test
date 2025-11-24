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

const PAGES_TO_CACHE = ['/', '/about', '/easy', '/medium', '/hard', '/results', '/consent'];

import localforage from 'localforage';
import { uploadResultsToDatabase } from './lib';

self.addEventListener('message', (event) => {
	if (event.data?.type === 'CACHE_PAGES') {
		cachePages();
	}

	if (event.data?.type === 'UPLOAD_RESULTS') {
		localforage.getItem('results-easy').then((r) => {
			console.log(r);
		});

		uploadResultsToDatabase();
	}
});

async function cachePages() {
	const cache = await caches.open(CACHE);

	for (const page of PAGES_TO_CACHE) {
		try {
			const response = await fetch(page);
			if (response.ok) {
				console.log('Pre-caching page:', page);
				cache.put(page, response.clone());
			}
		} catch (err) {
			console.log('Failed to pre-cache page:', page, 'OFFLINE');
		}
	}
}
