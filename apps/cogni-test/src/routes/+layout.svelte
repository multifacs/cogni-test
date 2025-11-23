<script lang="ts">
	import '../app.css';
	import '@fontsource/roboto';
	import localforage from 'localforage';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	let { children } = $props();

	function checkPushSupport() {
		const diagnostics = {
			serviceWorker: 'serviceWorker' in navigator,
			pushManager: 'PushManager' in window,
			userAgent: navigator.userAgent,
			https: window.location.protocol === 'https:',
			permissions: 'permissions' in navigator
		};

		console.log('Push Support Diagnostics:', diagnostics);
		// sendDebugInfo('Push Diagnostics', diagnostics);

		return diagnostics;
	}

	onMount(async () => {
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service workers not supported');
		}

		navigator.serviceWorker.register('/service-worker.js', {
			type: dev ? 'module' : 'classic'
		});

		// Run this on page load
		checkPushSupport();

		try {
			await localforage.setItem('TG_GROUP_LINK', 'https://t.me/+Q08ShGg2nSRhYTEy');
		} catch (err) {
			// This code runs if there were any errors.
			console.log(err);
		}
	});
</script>

<div class="fixed top-1 left-1 text-sm text-gray-500">dev</div>

{@render children()}
