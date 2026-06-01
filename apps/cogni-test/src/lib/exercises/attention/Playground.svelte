<script lang="ts">
	import AttentionGame from './AttentionGame.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { AttentionResult } from './types';

	let running = false;
	let finalResult: AttentionResult | null = null;

	function handleDone(e: CustomEvent<AttentionResult>) {
		finalResult = e.detail;
		running = false;
	}

	function restart() {
		running = false;
		finalResult = null;
	}
</script>

<div class="">
	{#if !finalResult}
		<AttentionGame on:done={handleDone} />
	{:else}
		<div class="flex flex-col items-center justify-center gap-4">
			<div class="flex items-center justify-between">
				<h1 class="text-xl font-extrabold">Результаты</h1>
			</div>
			<div class="grid grid-cols-3 gap-4">
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Найдено</span><strong class="text-2xl"
						>{finalResult.found} / {finalResult.n}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Время</span><strong class="text-2xl"
						>{finalResult.elapsed} сек</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Ошибки</span><strong class="text-2xl"
						>{finalResult.errors}</strong
					>
				</div>
			</div>
			<Button color="blue" onclick={restart}>Пройти заново</Button>
		</div>
	{/if}
</div>
