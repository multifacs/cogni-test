<script lang="ts">
	import FlankerGame from './FlankerGame.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { FlankerResult } from './types';

	let finished = $state(false);
	let finalResult: FlankerResult | null = $state(null);

	function handleDone(e: CustomEvent<FlankerResult>) {
		finalResult = e.detail;
		finished = true;
	}
</script>

<div>
	{#if !finished}
		<FlankerGame on:done={handleDone} />
	{:else}
		<div class="flex flex-col items-center justify-center gap-4">
			<div class="mb-3 flex items-center justify-between">
				<h1 class="m-0 text-xl font-extrabold">Результаты</h1>
			</div>
			<div class="grid max-w-[400px] grid-cols-2 gap-4">
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Верно</span><strong class="text-2xl"
						>{finalResult?.correctAnswers ?? 0} / {finalResult?.totalTrials ??
							0}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Время</span><strong class="text-2xl"
						>{finalResult?.elapsedTime ?? 0} сек</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Ошибки</span><strong class="text-2xl"
						>{finalResult?.errors ?? 0}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Flanker-эффект</span><strong
						class="text-2xl">{finalResult?.flankerEffectMs ?? 0} мс</strong
					>
				</div>
			</div>
			<Button color="blue" onclick={() => window.location.reload()}>Пройти заново</Button>
		</div>
	{/if}
</div>
