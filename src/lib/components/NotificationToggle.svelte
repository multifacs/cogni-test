<script lang="ts">
	import { onMount } from 'svelte';
	import { notifStore } from '$lib/stores/notif.js';

	let permission: NotificationPermission = 'default';
	let enabled = false;

	// Проверим текущее состояние разрешения при загрузке
	onMount(() => {
		if ('Notification' in window) {
			permission = Notification.permission;
			enabled = permission === 'granted';
		}
	});

	async function toggleNotifications() {
		if (!('Notification' in window)) {
			alert('Ваш браузер не поддерживает уведомления.');
			return;
		}

		if (!$notifStore) {
			enabled = true;
			notifStore.set(true);
			return;
		}

		if (permission === 'default') {
			// Запрашиваем разрешение
			const result = await Notification.requestPermission();
			permission = result;
			enabled = result === 'granted';

			if (enabled) {
				new Notification('Уведомления включены!');
				notifStore.set(true);
			}
		} else if (permission === 'granted') {
			// Отключаем (в приложении, но браузер не позволяет запрограммированно отозвать разрешение)
			enabled = false;
			alert(
				'Уведомления отключены для этого сеанса. Чтобы отключить полностью — измените настройки браузера.'
			);
			notifStore.set(false);
		} else {
			alert('Уведомления запрещены в настройках браузера.');
		}
	}
</script>

<button
	class={enabled ? 'bell' : 'bell-off'}
	onclick={toggleNotifications}
	aria-label="Toggle notifications"
	type="button"
></button>

<style>
	button {
		width: 40px;
		height: 40px;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
		border: none;
		cursor: pointer;
		filter: invert(90%);
	}
	.bell {
		background-image: url('/icons/bell.svg');
	}
	.bell-off {
		background-image: url('/icons/bell-off.svg');
	}
</style>
