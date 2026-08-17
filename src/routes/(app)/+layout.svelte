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
	<footer class="footer flex justify-center rounded-lg">
		<NavBar />
	</footer>
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

		/* .container {
			display: grid;
			grid-template-rows: 3rem auto 1fr auto 3rem;
			grid-template-columns: 1fr 4fr 1fr;
			height: 100dvh;
			grid-template-areas:
				'header header header'
				'left-aside banner right-aside'
				'left-aside main right-aside'
				'left-aside low-content right-aside'
				'left-aside footer right-aside';
			gap: 0.5rem;
			padding: 0.5rem;
			/* font-weight: 600;
			font-size: 1.25rem;
		} */

		/* .container {
			display: grid;
			grid-template-rows: auto 1fr auto 3rem;
			grid-template-columns: 1fr 4fr 1fr;
			height: 100dvh;
			grid-template-areas:
				'left-aside banner right-aside'
				'left-aside main right-aside'
				'left-aside low-content right-aside'
				'left-aside footer right-aside';
			gap: 0.5rem;
			padding: 0.5rem;
			font-size: 1.25rem;
		} */

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
				'footer';
			gap: 0.5rem;
			/* padding: 0.5rem; */
			font-size: 1.25rem;
			overflow: hidden;
		}

		.main {
			grid-area: main;
			/* background-color: #4286f433; */
			padding: 1rem;
			/* display: flex;
			justify-content: center;
			align-items: center;
			flex-direction: column;
			gap: 1rem; */
			min-height: 0;
			overflow-x: hidden; /* Enable horizontal scrolling */
			overflow-y: auto; /* Optional: enable vertical scrolling too */
			min-width: 0; /* Critical: allows flex children to shrink below content size */
			/* border-radius: var(--radius-lg); */
		}

		.banner {
			grid-area: banner;
			border-radius: var(--radius-lg);
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

		.footer {
			grid-area: footer;
			background-color: #fff;
			padding: 0.5rem;
			text-align: center;
			align-items: center;
			display: flex;
		}

		/* ✅ Better breakpoint */
		/* @media (max-width: 768px) {
			.container {
				grid-template-rows: 1rem 2rem 2rem 1fr 1.5rem 1.5rem 3rem;
				grid-template-columns: 1fr;
				grid-template-areas:
					'banner'
					'banner'
					'main'
					'main'
					'low-content'
					'low-content'
					'footer';
				gap: 0.3rem;
				padding: 0.3rem;
			}

			.header {
				display: none;
			}

			.left-aside {
				display: none;
			}

			.right-aside {
				display: none;
			}
		} */
	}
</style>
