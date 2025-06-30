<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';
	import NavBar from '$lib/components/ui/NavBar.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	onMount(async () => {
		userStore.set(data.user);

		if (data.MODE == 'PROD' && 'serviceWorker' in navigator && 'PushManager' in window) {
			const registration = await navigator.serviceWorker.register('/service-worker.js');

			// Проверяем разрешение
			let permission = Notification.permission;
			if (permission === 'default') {
				permission = await Notification.requestPermission();
			}
			if (permission !== 'granted') return;

			// Подписываемся
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: data.VAPID_PUBLIC_KEY
			});

			// Отправляем подписку на сервер
			await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(subscription)
			});
		}
	});
</script>

<div class="flex h-dvh w-full flex-col items-center sm:w-2xl">
	<div
		class="flex w-full flex-col items-center overflow-auto"
		style="height: calc(100dvh - 56.8px);"
	>
		{@render children()}
	</div>
	<NavBar />
</div>
