<script lang="ts">
	import PicturesGame from './PicturesGame.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { PicturesResult } from './types';

	let finished = $state(false);
	let finalResult: PicturesResult | null = $state(null);

	function handleDone(e: CustomEvent<PicturesResult>) {
		finalResult = e.detail;
		finished = true;
	}
</script>

<div class="flex flex-col items-center justify-center gap-2">
	{#if !finished}
		<PicturesGame on:done={handleDone} />
	{:else}
		<div class="head">
			<h1>Результаты</h1>
		</div>
		<div class="stats">
			<div>
				<span>Правильных</span><strong
					>{finalResult?.score ?? 0} / {finalResult?.maxScore ?? 0}</strong
				>
			</div>
			<div><span>Точность</span><strong>{finalResult?.normalizedScore ?? 0}%</strong></div>
		</div>
		<Button color="blue" onclick={() => window.location.reload()}>Пройти заново</Button>
	{/if}
</div>

<style>
	.wrap {
		padding: 1rem;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	h1 {
		font-weight: 800;
		font-size: 1.25rem;
		margin: 0;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
		max-width: 400px;
	}
	.stats div {
		background: #364b6c;
		padding: 16px;
		border-radius: 16px;
		text-align: center;
		color: white;
	}
	.stats span {
		display: block;
		opacity: 0.7;
		margin-bottom: 8px;
	}
	.stats strong {
		font-size: 1.5rem;
	}
</style>
