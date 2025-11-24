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
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let { children } = $props();

	let subscribed = $state(false);
	let showModal = $state(false);

	let loading = $state(false);
	let loadingError = $state(false);
	let loadingSuccess = $state(false);

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

		console.log('is Online:', navigator.onLine);
		if ('serviceWorker' in navigator && navigator.onLine) {
			navigator.serviceWorker.ready.then((reg) => {
				reg.active?.postMessage({
					type: 'CACHE_PAGES'
				});
			});
		}
	});

	async function subscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		try {
			loading = true;
			await pushService.subscribe();
			subscribed = true;
			showModal = false;
			console.log('Subscribed successfully');
			loadingSuccess = true;
		} catch (error) {
			loadingError = true;
			console.error('Failed to subscribe:', error);
		} finally {
			loading = false;
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

			<div class="w-full flex justify-center items-center text-sm text-white">
				{#if loading}
					<Spinner></Spinner>
				{:else if loadingError}
					Ошибка подключения. Попробуйте позже.
				{:else if loadingSuccess}
					уведомления подключены.
				{/if}
			</div>

			<Button color="green" onclick={subscribe}>Подписаться</Button>
			<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
		</div>
	</Modal>
{/if}

{@render children()}
