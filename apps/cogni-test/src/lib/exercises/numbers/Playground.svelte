<script lang="ts">
	import NumbersGame from './NumbersGame.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { NumbersResult } from './types';

	let finished = $state(false);
	let finalResult: NumbersResult | null = $state(null);

	function handleDone(e: CustomEvent<NumbersResult>) {
		finalResult = e.detail;
		finished = true;
	}
</script>

<div class="p-4">
	{#if !finished}
		<NumbersGame on:done={handleDone} />
	{:else}
		<div class="flex flex-col items-center justify-center gap-4">
			<div class="mb-3 flex items-center justify-between">
				<h1 class="m-0 text-xl font-extrabold">Результаты</h1>
			</div>
			<div class="grid max-w-[400px] grid-cols-2 gap-4">
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Верно</span><strong class="text-2xl"
						>{finalResult?.correct ?? 0} / {finalResult?.total ?? 0}</strong
					>
				</div>
				<div class="rounded-2xl bg-[#364b6c] p-4 text-center text-white">
					<span class="mb-2 block opacity-70">Max span</span><strong class="text-2xl"
						>{finalResult?.digitSpan ?? 0}</strong
					>
				</div>
			</div>
			<Button color="blue" onclick={() => window.location.reload()}>Пройти заново</Button>
		</div>
	{/if}
</div>
