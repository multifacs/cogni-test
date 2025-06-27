<script lang="ts">
	import { onMount } from 'svelte';
	let { data, children } = $props();

	onMount(async () => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
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

{@render children()}
