<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';
	import { pushService } from '$lib/pushService';

	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import { isSubscribed } from '$lib/utils/push';

	let subscribed = $state(false);
	let showModal = $state(false);

	let { data, children, leftAside }: { data: LayoutData; children: Snippet; leftAside: Snippet } =
		$props();

	onMount(async () => {
		userStore.set(data.user);

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

<div>
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
				<p class="text-white">Для подписки достаточно нажать зелёную кнопочку.</p>
				<p class="text-white">
					Вы всегда сможете подписаться или отписаться от push-уведомлений в любое время
					на странице профиля.
				</p>
				<Button color="green" onclick={subscribe}>Подписаться</Button>
				<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
			</div>
		</Modal>
	{/if}
</div>

<div class="container">
	<header class="header">Header</header>
	<aside class="left-aside">Left Aside</aside>
	{@render children()}
	<aside class="right-aside">Right Aside</aside>
	<footer class="footer flex justify-center">
		<div class="w-2/3 max-md:w-full">
			<NavBar />
		</div>
	</footer>
</div>

<style>
	:global {
		.container {
			display: grid;
			grid-template-rows: 5rem auto 1fr auto 3rem;
			grid-template-columns: 1fr 4fr 1fr;
			height: 100dvh;
			grid-template-areas:
				'header header header'
				'left-aside banner right-aside'
				'left-aside main right-aside'
				'left-aside low-content right-aside'
				'footer footer footer';
			gap: 0.625rem;
			padding: 0.625rem;
			font-weight: 600;
			font-size: 1.25rem;
		}

		.header {
			grid-area: header;
			background-color: #f4b30081;
			padding: 1.25rem;
			text-align: center;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.left-aside {
			grid-area: left-aside;
			background-color: #0f9d5880;
			padding: 1.25rem;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.main {
			grid-area: main;
			background-color: #4286f46d;
			padding: 1.25rem;
			/* display: flex;
			justify-content: center;
			align-items: center;
			flex-direction: column;
			gap: 1rem; */
			overflow-x: auto; /* Enable horizontal scrolling */
			overflow-y: auto; /* Optional: enable vertical scrolling too */
			min-width: 0; /* Critical: allows flex children to shrink below content size */
		}

		.banner {
			grid-area: banner;
			background-color: #db453774;
			padding: 1.25rem;
			text-align: center;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.right-aside {
			grid-area: right-aside;
			background-color: #f4b30076;
			padding: 1.25rem;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.low-content {
			grid-area: low-content;
			background-color: #0f9d586d;
			padding: 1.25rem;
			/* display: flex;
			justify-content: center;
			align-items: center; */
		}

		.footer {
			grid-area: footer;
			background-color: #4286f479;
			padding: 1.25rem;
			text-align: center;
			align-items: center;
			display: flex;
		}

		/* ✅ Better breakpoint */
		@media (max-width: 768px) {
			.container {
				grid-template-rows: 2.5rem 2rem 3rem 1fr 3rem 2rem 3rem;
				grid-template-columns: 1fr;
				grid-template-areas:
					'header'
					'banner'
					'banner'
					'main'
					'low-content'
					'low-content'
					'footer';
			}

			.left-aside {
				display: none;
			}

			.right-aside {
				display: none;
			}
		}
	}
</style>
