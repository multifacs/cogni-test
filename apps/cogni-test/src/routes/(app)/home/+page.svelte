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
	</div>
</main>
<section class="low-content flex items-center justify-center">
	<p class="max-w-md text-center text-lg">Выберите, с чего начать.</p>
</section>

<style>
</style>
