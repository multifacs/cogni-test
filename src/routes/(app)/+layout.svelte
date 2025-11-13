<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';
	import { pushService } from '$lib/pushService';

	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavBar from '$lib/components/ui/NavBar.svelte';

    let registration: ServiceWorkerRegistration | undefined = $state();
    let subscription: PushSubscription | null = $state(null);
    let isSubscribed = $state(false);
    let showModal = $state(false);

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(async () => {
        userStore.set(data.user);

        registration = await navigator.serviceWorker.ready;

        subscription = await pushService.getSubscription(registration);
        isSubscribed = !!subscription;
        showModal = !subscription;
        console.log('showModal:', showModal);
	});

	async function subscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		if (!registration) {
			console.error('No service worker registration found');
			return;
		}

		try {
			await pushService.subscribe(registration);
			isSubscribed = true;
			showModal = false;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}

	async function unsubscribe() {
		if (!registration) {
			console.error('No service worker registration found');
			return;
		}

		try {
			await pushService.unsubscribe(registration);
			subscription = null;
			isSubscribed = false;
			console.log('Unsubscribed successfully');
		} catch (error) {
			console.error('Failed to unsubscribe:', error);
		}
	}

	async function sendTestNotification() {
		if (!subscription) return;

		try {
			await fetch('/api/push/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					subscription,
					payload: {
						title: 'Test Notification',
						body: 'This is a test push notification!',
						icon: '/favicon.png'
					}
				})
			});
		} catch (error) {
			console.error('Failed to send notification:', error);
		}
	}

	async function sendAllTestNotification() {
		if (!subscription) return;

		try {
			await fetch('/api/push/send-to-all', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					subscription,
					payload: {
						title: 'Test Notification',
						body: 'This is a test push notification for all!',
						icon: '/favicon.png'
					}
				})
			});
		} catch (error) {
			console.error('Failed to send notification:', error);
		}
	}
</script>

<div>
	<h1>Push Notifications Demo</h1>

	{#if showModal}
		<Modal bind:showModal>
			{#snippet header()}
				<h2 class="text-2xl text-white">Подпишитесь на пуш-уведомления</h2>
			{/snippet}
			<div class="flex flex-col gap-4">
				<p class="text-white">
					Для корректной работы некоторых функций требуется подписка на уведомления.
					Например, мы сможем отправлять вам напоминания о прохождении тестов.
				</p>
				<p class="text-white">Для подписки достаточно нажать зелёную кнопочку и всё</p>
				<Button color="green" onclick={subscribe}>Подписаться</Button>
				<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
			</div>
		</Modal>
	{/if}

	{#if isSubscribed}
		<p>✅ You are subscribed to notifications</p>
		<Button color="red" onclick={unsubscribe}>Unsubscribe</Button>
		<Button color="blue" onclick={sendTestNotification}>Send Test Notification</Button>
		<Button color="blue" onclick={sendAllTestNotification}>Send All Test Notification</Button>
	{:else}
		<p>❌ You are not subscribed to notifications</p>
		<Button color="green" onclick={subscribe}>Subscribe to Notifications</Button>
	{/if}
</div>
<div class="flex h-dvh w-full flex-col items-center sm:w-2xl">
	<div
		class="flex w-full flex-col items-center overflow-auto"
		style="height: calc(100dvh - 56.8px);"
	>
		{@render children()}
	</div>
	<NavBar />
</div>
