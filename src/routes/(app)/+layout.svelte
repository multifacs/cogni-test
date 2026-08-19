<script lang="ts">
	import { onMount, setContext, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { profileSurveyStore, userStore } from '$lib/stores/user';
	import { pushService } from '$lib/pushService';

	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { isSubscribed } from '$lib/utils/push';
	import Header from '$lib/components/ui/Header.svelte';

	let subscribed = $state(false);
	let showModal = $state(false);
	let showSpinner = $state(false);

	let {
		data,
		children,
		leftAside
	}: {
		data: LayoutData;
		children: Snippet;
		leftAside: Snippet;
	} = $props();

	let headerText = $state('');

	setContext('headerText', {
		get value() {
			return headerText;
		},
		set value(v: string) {
			headerText = v;
		}
	});

	onMount(async () => {
		userStore.set(data.user);
		console.log(data.profileSurvey);
		profileSurveyStore.set(data.profileSurvey);
		console.log('Profile survey set in store:', { ...$profileSurveyStore });

		subscribed = await isSubscribed();
		showModal = !subscribed;

		fetch('/api/ping', { method: 'POST' }).catch(() => {});
	});

	async function subscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		try {
			showSpinner = true;
			await pushService.subscribe();
			showSpinner = false;
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
				<h2 class="text-2xl text-white">Подпишитесь на push-уведомления</h2>
			{/snippet}
			<div class="flex flex-col gap-4">
				{#if showSpinner}
					<div
						class="flex w-full flex-col items-center justify-center gap-2 align-middle"
					>
						<Spinner></Spinner>
						<p class="text-center text-white">
							Перезагрузите страницу, если загрузка идет долго
						</p>
					</div>
				{:else}
					<p class="text-white">
						Для корректной работы некоторых функций требуется подписка на уведомления.
						Например, мы сможем отправлять вам напоминания о прохождении тестов.
					</p>
					<p class="text-white">Для подписки достаточно нажать зелёную кнопочку.</p>
					<p class="text-white">
						Вы сможете подписаться или отписаться от push-уведомлений в любое время на
						странице профиля.
					</p>
					<Button color="green" onclick={subscribe}>Подписаться</Button>
					<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
				{/if}
			</div>
		</Modal>
	{/if}
</div>

<div class="container">
	<header>
		<Header text={headerText} />
	</header>
	{@render children()}
		<NavBar />
</div>

<style>
	:global {
		* {
			box-sizing: border-box;
		}

		html,
		body {
			margin: 0;
			padding: 0;
			height: 100dvh;
			overflow: hidden;
		}

		.container {
			background-color: var(--main-bg-color);
			display: grid;
			grid-template-rows: auto 1fr auto;
			grid-template-columns: 1fr;

			height: 100dvh;
			width: 100dvw;
			max-width: 100%;
			grid-template-areas:
				'banner'
				'main'
				'low-content '
				'nav';
			/* padding: 0.5rem; */
			font-size: 1.25rem;
			overflow: hidden;
		}

		.main {
			grid-area: main;
			padding: 1rem;
			min-height: 0;
			overflow-x: hidden;
			overflow-y: auto;
			min-width: 0;
			color:var(--main-text-color)
		}

		.banner {
			grid-area: banner;
			background-color: #4286f41b;
			padding: 1rem;
			text-align: center;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.low-content {
			grid-area: low-content;
			/* background-color: #0f9d581d; */
			background-color: #4286f42e;
			padding: 0.5rem;
			border-radius: var(--radius-lg);
			/* display: flex;
			justify-content: center;
			align-items: center; */
		}
	}
	@media (min-width: 1024px) {
		.container {
			grid-template-rows: auto 1fr auto;
			grid-template-columns: auto 1fr;
			grid-template-areas:
				'nav banner'
				'nav main'
				'nav low-content ';
		}
	}
</style>
