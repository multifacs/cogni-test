<script lang="ts">
	import { onMount } from 'svelte';
	let { data, children } = $props();
	import { notifStore } from '$lib/stores/notif.js';

	let notificationInterval: NodeJS.Timer;

	let tests;

	onMount(() => {
		if (!('Notification' in window)) return;
		tests = data.tests;

		console.log('passed');

		if (Notification.permission === 'granted') {
			// Запускаем таймер уведомлений
			console.log('passed 2', data);
			notificationInterval = setInterval(() => {
				const test = getRandomTest();
				sendTestNotification(test);
			}, 600_000); // 600 секунд
		}

		// Очистка интервала при уничтожении компонента
		return () => clearInterval(notificationInterval);
	});

	function getRandomTest() {
		const index = Math.floor(Math.random() * tests.length);
		return tests[index];
	}

	function sendTestNotification(test: (typeof tests)[number]) {
        if (!$notifStore) return;
		new Notification('Попробуйте пройти тест!', {
			body: `${test.title}`,
			icon: test.img
		});
	}
</script>

{@render children()}
