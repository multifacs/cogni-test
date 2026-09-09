<script lang="ts">
	import { onMount, setContext, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
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
		children
	}: {
		data: LayoutData;
		children: Snippet;
	} = $props();

	let headerText = $state('');

	// Hide the bottom nav on very small phones (<sm, 640px) inside content
	// sections — test/exercise/article screens need every pixel of height.
	// Section roots (/tests, /exercises, /materials) keep the nav: they have
	// no "back" button, so the nav is the only way out of the section there.
	const hideNavOnSmallScreens = $derived(
		/^\/(tests|exercises|materials)\/.+/.test(page.url.pathname)
	);

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
				<h2 class="text-center text-2xl">Подпишитесь на push-уведомления</h2>
			{/snippet}
			<div class="flex flex-col gap-4">
				{#if showSpinner}
					<div
						class="flex w-full flex-col items-center justify-center gap-2 align-middle"
					>
						<Spinner></Spinner>
						<p class="text-center">Перезагрузите страницу, если загрузка идет долго</p>
					</div>
				{:else}
					<p>
						Для корректной работы некоторых функций требуется подписка на уведомления.
						Например, мы сможем отправлять вам напоминания о прохождении тестов.
					</p>
					<p>Для подписки достаточно нажать зелёную кнопочку.</p>
					<p>
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
	<!-- On very small phones (<sm) inside content sections the nav is hidden
	     via CSS — those pages have their own "Назад" button and need the height.
	     Section roots (/tests, /exercises, /materials) keep the nav: they have
	     no "back" button, so the nav is the only way out of the section there. -->
	<div class="nav-slot" class:nav-hidden={hideNavOnSmallScreens}>
		<NavBar undiagnosed={data.undiagnosed} allowedPaths={data.allowedPaths} />
	</div>
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
			font-size: 1.25rem;
			overflow: hidden;
		}

		.main {
			grid-area: main;
			padding: 4%;
			min-height: 0;
			overflow-x: hidden;
			overflow-y: auto;
			min-width: 0;
			/*color: var(--main-text-color);*/
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
			padding: 2% 15%;
			border-radius: var(--radius-lg);
		}

		/* display: contents keeps <nav> the actual grid item (as before the
		   wrapper existed), so it still stretches over the full 'nav' area.
		   The wrapper only exists to hide the nav on <sm via display:none. */
		.nav-slot {
			display: contents;
		}

		/* Very small phones: hide the bottom nav inside content sections
		   (tests/exercises/materials subpages). Only <sm (<640px). */
		@media (max-width: 639px) {
			.nav-slot.nav-hidden {
				display: none;
			}
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
