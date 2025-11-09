<script lang="ts">
	import '../app.css';
	import '@fontsource/roboto';
	let { data, children } = $props();

	import { onMount } from 'svelte';
	import { PushService } from '$lib/pushService';
	import Button from '$lib/components/ui/Button.svelte';

	let pushService = $state(null);
	let isSubscribed = $state(false);
	let subscription = $state(null);

	onMount(async () => {
		pushService = new PushService();
		subscription = await pushService.getSubscription();
		isSubscribed = !!subscription;
	});

	async function subscribe() {
		try {
			subscription = await pushService.subscribe();
			isSubscribed = true;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}

	async function unsubscribe() {
		try {
			await pushService.unsubscribe();
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

<div hidden>
	<h1>Push Notifications Demo</h1>

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

<div class="text-gray-500 text-sm fixed top-1 left-1">
	{ data.MODE }
</div>

{@render children()}
