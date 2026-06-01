<script lang="ts">
	import LettersGame from './LettersGame.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { LettersResult } from './types';

	let finished = $state(false);
	let finalResult: LettersResult | null = $state(null);

	function handleDone(e: CustomEvent<LettersResult>) {
		finalResult = e.detail;
		finished = true;
	}
</script>

<div class="">
	{#if !finished}
		<LettersGame on:done={handleDone} />
	{:else}
		<div class="flex flex-col items-center justify-center gap-4">
			<div class="mb-3 flex items-center justify-between">
				<h1 class="m-0 text-xl font-extrabold">Результаты</h1>
			</div>
			<div class="grid max-w-[400px] grid-cols-2 gap-4">
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Max span</span><strong class="text-2xl"
						>{finalResult?.maxSpan ?? 0}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Раундов</span><strong class="text-2xl"
						>{finalResult?.roundsCompleted ?? 0}</strong
					>
				</div>
				<div class="col-span-2 rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Время</span><strong class="text-2xl"
						>{finalResult?.elapsed ?? 0} сек</strong
					>
				</div>
			</div>
			<Button color="blue" onclick={() => window.location.reload()}>Пройти заново</Button>
		</div>
	{/if}
</div>
