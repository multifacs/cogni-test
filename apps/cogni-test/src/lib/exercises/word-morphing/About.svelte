<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { pushService } from '$lib/pushService';

	import { v7 as uuid } from 'uuid';

	import { dev } from '$app/environment';

	async function ensurePermission() {
		if (!('Notification' in window)) {
			alert('Уведомления не поддерживаются в этом браузере.');
			return false;
		}
		if (Notification.permission === 'granted') return true;
		const perm = await Notification.requestPermission();
		return perm === 'granted';
	}

	async function sendLocalNotification() {
		const ok = await ensurePermission();
		if (!ok) return;
		try {
			new Notification('Локальное уведомление', {
				body: 'Тест локального уведомления для приложения.',
				tag: 'local-test'
			});
		} catch (err) {
			alert('Не удалось показать локальное уведомление: ' + err.message);
		}
	}

	async function sendServiceWorkerNotification() {
		if (!('serviceWorker' in navigator)) {
			alert('Service Worker не поддерживается в этом браузере.');
			return;
		}
		const ok = await ensurePermission();
		if (!ok) return;
		try {
			const reg = await navigator.serviceWorker.ready;
			// Показать уведомление через Service Worker — имитирует push-поведение
			reg.showNotification('Push-подобное уведомление', {
				body: 'Тест через Service Worker (showNotification).',
				tag: 'push-test'
			});
		} catch (err) {
			alert('Не удалось показать push-уведомление: ' + err.message);
		}
	}

	async function sendServerNotification() {
		const now = Date.now();
		const timerEndsAt = now + 5 * 1000;

		try {
			// Get current subscription to send endpoint
			const subscription = await pushService.getSubscription();
			if (subscription) {
				await fetch('/api/push/schedule', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						endpoint: subscription.endpoint,
						payload: {
							id: `word-morphing-${uuid()}`,
							title: 'Время вышло!',
							body: 'Пора вспомнить сочетания.'
						},
						scheduledFor: timerEndsAt
					})
				});
			}
		} catch (error) {
			console.error('Failed to schedule web push notification:', error);
			// Fall back to local notification
			// Local notification will be shown when timer expires
		}
	}

	let subscribed = false;

	async function subscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		try {
			await pushService.subscribe();
			subscribed = true;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}

	async function unsubscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		try {
			await pushService.unsubscribe();
			subscribed = true;
			console.log('Unsubscribed successfully');
		} catch (error) {
			console.error('Failed to unsubscribe:', error);
		}
	}
</script>

<p>
	В этом тесте вы получите словосочетание, например, «мыльный ананас». Вам предложат сначала
	заменить прилагательное, затем — существительное. В конце вам нужно будет воспроизвести все
	полученные словосочетания.
</p>

{#if dev}
	<div class="mt-4 flex flex-col gap-4">
		<Button onclick={sendLocalNotification} color="green"
			>Отправить локальное уведомление</Button
		>
		<Button onclick={sendServiceWorkerNotification} color="blue">
			Отправить push-подобное уведомление (Service Worker)
		</Button>
		<div class="flex w-full grow justify-around gap-2">
			<Button onclick={subscribe} color="sky" class="grow">Подписаться</Button>
			<Button onclick={unsubscribe} color="rose" class="grow">Отписаться</Button>
		</div>
		<Button onclick={sendServerNotification} color="yellow"
			>Отправить Web Push API уведомление</Button
		>
	</div>
{/if}
