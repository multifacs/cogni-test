<script lang="ts">
	import '../app.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import { userManager } from '$lib/userStore';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';

	import { pushService } from '$lib/pushService';
	import { isSubscribed } from '$lib/utils/push';
	import Button from '$lib/components/ui/Button.svelte';

	let { children } = $props();

	let subscribed = $state(false);
	let showModal = $state(false);

	onMount(async () => {
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service workers not supported');
		}

		navigator.serviceWorker.register('/service-worker.js', {
			type: dev ? 'module' : 'classic'
		});

		const auth = await userManager.checkAuth();
		if (!auth) {
			goto('/');
		}

		// Проверям подписку на пуш
		subscribed = await isSubscribed();
		showModal = !subscribed;
	});

	async function subscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		try {
			await pushService.subscribe();
			subscribed = true;
			showModal = false;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if showModal}
	<Modal bind:showModal>
		{#snippet header()}
			<h2 class="text-2xl text-white">Подпишитесь на пуш-уведомления</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				Для корректной работы загрузки результатов тестирования требуется подписка на уведомления.
			</p>
			<p class="text-white">Для подписки достаточно нажать зелёную кнопочку.</p>
			<p class="text-white">
				Вы всегда сможете подписаться или отписаться от push-уведомлений в любое время на странице
				профиля.
			</p>
			<Button color="green" onclick={subscribe}>Подписаться</Button>
			<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
		</div>
	</Modal>
{/if}

{@render children()}
