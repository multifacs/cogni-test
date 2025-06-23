/// <reference types="@sveltejs/kit" />
// import { build, files, prerendered, version } from '$service-worker';
// import {precacheAndRoute} from 'workbox-precaching';

self.addEventListener('push', (event) => {
	const data = event.data?.json();
	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: data.icon,
			tag: data.tag || 'default'
		})
	);
});
