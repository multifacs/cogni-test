<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';
	import { pushService } from '$lib/pushService';

	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import { isSubscribed } from '$lib/utils/push';

	let subscription: PushSubscription | null = $state(null);
	let subscribed = $state(false);
	let showModal = $state(false);

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(async () => {
		userStore.set(data.user);

		subscribed = await isSubscribed();
		subscription = await pushService.getSubscription();
		showModal = !subscribed;
		console.log('showModal:', showModal);
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

<div>
{#if showModal}
	<Modal bind:showModal>
		{#snippet header()}
			<h2 class="text-2xl text-white">Подпишитесь на пуш-уведомления</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				Для корректной работы некоторых функций требуется подписка на уведомления. Например,
				мы сможем отправлять вам напоминания о прохождении тестов.
			</p>
			<p class="text-white">Для подписки достаточно нажать зелёную кнопочку.</p>
			<p class="text-white">
				Вы всегда сможете подписаться или отписаться от push-уведомлений в любое время на
				странице профиля.
			</p>
			<Button color="green" onclick={subscribe}>Подписаться</Button>
			<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
		</div>
	</Modal>
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
