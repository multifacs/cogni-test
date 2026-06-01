<script lang="ts">
	import EmojiGame from './EmojiGame.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { EmojiResult } from './types';

	let running = true;
	let finalResult: EmojiResult | null = null;

	function handleDone(e: CustomEvent<EmojiResult>) {
		finalResult = e.detail;
		running = false;
	}

	function restart() {
		running = true;
		finalResult = null;
	}
</script>

<div class="">
	{#if running}
		<EmojiGame on:done={handleDone} />
	{:else if finalResult}
		<div class="flex flex-col items-center justify-center gap-4">
			<div class="mb-3 flex items-center justify-between">
				<h1 class="m-0 text-xl font-extrabold">Результаты</h1>
			</div>
			<div class="grid max-w-[500px] grid-cols-3 gap-4">
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block text-sm opacity-70">Верно</span><strong class="text-2xl"
						>{finalResult.score}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block text-sm opacity-70">Ошибки</span><strong
						class="text-2xl">{finalResult.mistakes}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block text-sm opacity-70">Точность</span><strong
						class="text-2xl">{finalResult.accuracy}%</strong
					>
				</div>
			</div>
			<Button color="blue" onclick={restart}>Пройти заново</Button>
		</div>
	{/if}
</div>
