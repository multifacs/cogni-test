<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import localforage from 'localforage';

	let diferredInstallEvent: any | null = $state(null);
	let showInstallButton = $state(true);
	let showModal = $state(false);

	onMount(async () => {
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
			showModal = false;
		});

		// don't show button if user in the standalone app
		if (checkStandaloneMode()) {
			showInstallButton = false;
			localforage.setItem('showInstallButton', false);
		}
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
			showModal = true;
		}
	}

	const checkStandaloneMode = () => {
		if (!browser) return false;
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone === true
		);
	};
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Добро пожаловать!</h1>
</section>
<main class="main flex flex-col items-center justify-center gap-4">
	<div class="flex w-full max-w-xs flex-col gap-4">
		<Button color="green" goto="/tests">🧪 Когнитивный возраст</Button>
		<Button color="gray" goto="/exercises">📊 Когнитивный тренажёр</Button>
		<Button color="blue" goto="/materials">📚 Когнитивное долголетие</Button>

		{#if showInstallButton}
			<div class="flex w-full max-w-xs flex-col gap-4 text-center">
				<h3 class="text-lg">Вы также можете установить приложение на своем устройстве</h3>
				<Button color="green" onclick={handleInstall}>Установить приложение</Button>
			</div>
		{/if}
		{#if showModal}
			<Modal bind:showModal>
				{#snippet header()}
					<div class="flex flex-col gap-4">
						<h2 class="text-2xl text-white">
							Установка приложения на не chrome-based браузерах
						</h2>
						<p class="text-white">Похоже, Вы используете firefox или safari.</p>
						<p class="text-white">
							Если Вы используете <b>Safari</b>, то вы можете установить приложение на
							своем устройстве вручную.
						</p>
						<ol class="list-inside list-decimal text-white">
							<li>
								<b>Нажмите «Поделиться»</b>: Найдите иконку "Поделиться" (квадрат со
								стрелкой, смотрящей вверх) внизу или вверху экрана и нажмите на нее.
							</li>
							<li>
								<b>Выберите «На экран «Домой»»:</b> В появившемся меню прокрутите вниз
								и выберите этот пункт.
							</li>
							<li>
								<b>Подтвердите установку:</b> Задайте имя для ярлыка и нажмите Добавить
								в правом верхнем углу.
							</li>
							<li>
								<b>Готово:</b> Иконка PWA появится на главном экране, и при нажатии он
								будет запускаться как отдельное приложение.
							</li>
						</ol>
						<p class="text-white">
							<b>Firefox</b> не поддерживает установку pwa приложений. В этом случае воспользуйтесь
							другим браузером.
						</p>
					</div>
				{/snippet}
				<div class="flex flex-col gap-4">
					<Button color="green" onclick={() => (showModal = false)}>Понятно</Button>
					<Button
						color="red"
						onclick={() => {
							localforage.setItem('showInstallButton', false);
							showModal = false;
						}}>Больше не показывать</Button
					>
				</div>
			</Modal>
		{/if}
	</div>
</main>
<section class="low-content flex items-center justify-center">
	<p class="max-w-md text-center text-lg max-md:text-sm">Выберите, с чего начать.</p>
</section>

<style>
</style>
