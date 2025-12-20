<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let showUpdate = false;

	onMount(() => {
		if (!browser || !('serviceWorker' in navigator)) return;

		navigator.serviceWorker.getRegistration().then((registration) => {
			if (!registration) return;

			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing;

				newWorker?.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						showUpdate = true;
					}
				});
			});

			setInterval(
				() => {
					registration.update();
				},
				5 * 60 * 1000
			);
		});
	});
</script>

{#if showUpdate}
	<div
		class="fixed top-0 left-0 right-0 z-9999 flex items-center justify-center p-4
		bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600
		shadow-xl animate-pulse"
	>
		<div class="flex items-center gap-4 text-white">
			<span class="text-2xl animate-bounce">⚠️</span>

			<div class="text-center">
				<div class="text-lg font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
					Доступно обновление
				</div>
				<div class="text-sm font-normal drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">
					Закройте вкладку с приложением и откройте заново
				</div>
			</div>

			<span class="text-2xl animate-bounce [animation-delay:0.2s]">⚠️</span>
		</div>
	</div>
{/if}
