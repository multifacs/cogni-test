<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { getContext, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import localforage from 'localforage';
	import { goto } from '$app/navigation';
	import { userStore } from '$lib/stores/user';
	import AgeCard from '$lib/components/ui/AgeCard.svelte';
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';

	let { data } = $props();

	function capitalize(str: string): string {
		if (!str) return 'Пользователь';
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	let diferredInstallEvent: any | null = $state(null);
	let showInstallButton = $state(true);
	let showInstallModal = $state(false);
	let undiagnosed = $state(false);
	let userName = $state('Пользователь');
	let greeting = $state('Добрый день');
	let realAge = $state<number | null>(null);

	const headerContext = getContext<{ value: string }>('headerText');

	function updateGreetingAndHeader() {
		const hour = new Date().getHours();
		let newGreeting;
		if (hour < 12) newGreeting = 'Доброе утро';
		else if (hour < 18) newGreeting = 'Добрый день';
		else newGreeting = 'Добрый вечер';

		greeting = newGreeting;

		if (headerContext) {
			headerContext.value = `${greeting}, ${userName}!`;
		}
	}

	onMount(async () => {
		if (data.hasUnfinishedTests && !data.loggedInAdmin) {
			undiagnosed = true;
		}

		const lfShowInstallButton: boolean | null = await localforage.getItem('showInstallButton');
		if (lfShowInstallButton === false) {
			showInstallButton = false;
		} else if (lfShowInstallButton === null) {
			showInstallButton = true;
		}

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			diferredInstallEvent = e;
			showInstallButton = true;
			localforage.setItem('showInstallButton', true);
		});

		window.addEventListener('appinstalled', () => {
			showInstallButton = false;
			localforage.setItem('showInstallButton', false);
			showInstallModal = false;
		});

		if (checkStandaloneMode()) {
			showInstallButton = false;
			localforage.setItem('showInstallButton', false);
		}

		updateGreetingAndHeader();
		const unsubscribeUser = userStore.subscribe((user) => {
			if (user) {
				const rawName = (user as any).firstname || 'пользователь';
				userName = capitalize(rawName);

				const userBirthday = user.birthday || null;
				if (userBirthday) {
					const birthDate = new Date(userBirthday);
					const today = new Date();
					let age = today.getFullYear() - birthDate.getFullYear();
					const monthDiff = today.getMonth() - birthDate.getMonth();
					if (
						monthDiff < 0 ||
						(monthDiff === 0 && today.getDate() < birthDate.getDate())
					) {
						age--;
					}
					realAge = age;
				}
				updateGreetingAndHeader();
			}
		});

		return () => {
			unsubscribeUser();
		};
	});

	async function handleInstall() {
		if (diferredInstallEvent) {
			diferredInstallEvent.prompt();
			const { outcome } = await diferredInstallEvent.userChoice;
			console.log('user responded with', outcome);
			if (outcome === 'accepted') {
				showInstallButton = false;
				diferredInstallEvent = null;
				showInstallButton = false;
				localforage.setItem('showInstallButton', false);
			}
		} else {
			showInstallModal = true;
		}
	}

	function handleRunAll() {
		localforage.setItem('runAllMode', true);
		goto('/tests');
	}

	const checkStandaloneMode = () => {
		if (!browser) return false;
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone === true
		);
	};
</script>

<main class="main">
	{#if !undiagnosed}
		<div class="flex flex-col items-center gap-6">
			<div class="main-content gap-6">
				<AgeCard age={data.predictedAge} {realAge} />
				<div class="justify-beetwen n flex flex-col justify-around gap-6">
					<Button color="green" goto="/exercises">Продолжить тренировки</Button>
					<RecommendationCard
						title="Совет дня"
						text="Статья: как физическая активность влияет на память"
						icon="/icons/book-open.svg"
						goto="/materials"
						button_text="Прочитать"
					/>
				</div>
			</div>

			{#if showInstallButton}
				<div class="flex w-full max-w-xs flex-col gap-4 text-center">
					<h3 class="text-lg">
						Вы также можете установить приложение на своем устройстве
					</h3>
					<Button color="green" onclick={handleInstall}>Установить приложение</Button>
				</div>
			{/if}
			{#if showInstallModal}
				<Modal bind:showModal={showInstallModal}>
					{#snippet header()}
						<div class="flex flex-col gap-4">
							<h2 class="text-2xl">
								Установка приложения на не chrome-based браузерах
							</h2>
							<p>Похоже, Вы используете firefox или safari.</p>
							<p>
								Если Вы используете <b>Safari</b>, то вы можете установить
								приложение на своем устройстве вручную.
							</p>
							<ol class="list-inside list-decimal">
								<li>
									<b>Нажмите «Поделиться»</b>: Найдите иконку "Поделиться"
									(квадрат со стрелкой, смотрящей вверх) внизу или вверху экрана и
									нажмите на нее.
								</li>
								<li>
									<b>Выберите «На экран «Домой»»:</b> В появившемся меню прокрутите
									вниз и выберите этот пункт.
								</li>
								<li>
									<b>Подтвердите установку:</b> Задайте имя для ярлыка и нажмите Добавить
									в правом верхнем углу.
								</li>
								<li>
									<b>Готово:</b> Иконка PWA появится на главном экране, и при нажатии
									он будет запускаться как отдельное приложение.
								</li>
							</ol>
							<p class="">
								<b>Firefox</b> не поддерживает установку pwa приложений. В этом случае
								воспользуйтесь другим браузером.
							</p>
						</div>
					{/snippet}
					<div class="flex flex-col gap-4">
						<Button color="green" onclick={() => (showInstallModal = false)}
							>Понятно</Button
						>
						<Button
							color="red"
							onclick={() => {
								localforage.setItem('showInstallButton', false);
								showInstallModal = false;
							}}>Больше не показывать</Button
						>
					</div>
				</Modal>
			{/if}
		</div>
	{:else}
		<div class="flex w-full max-w-xs flex-col gap-4">
			<h2 class="text-center">
				Пройдите начальную диагностику, чтобы узнать свой когнитивный возраст.
			</h2>
			<p class="text-base">
				После этого Вам откроется тренажёр и много других интересных возможностей.
			</p>
			<Button color="green" onclick={handleRunAll}>Пройти диагностику</Button>
		</div>
	{/if}
</main>

<style>
	.main-content {
		display: grid;
		grid-template-columns: 1fr;
	}
	@media (min-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr 1fr;
			gap: 5rem;
		}
	}
</style>
