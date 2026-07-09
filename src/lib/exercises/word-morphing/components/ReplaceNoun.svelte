<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let { category, nounChoices, setNoun, colorChoices, currentShape } = $props();
</script>

{#if category === 'words'}
	<h2>Выберите новое существительное:</h2>
	<div class="grid max-w-lg grid-cols-2 gap-4">
		{#each nounChoices as noun}
			<Button color="green" onclick={() => setNoun(noun)}>{noun}</Button>
		{/each}
	</div>
{:else}
	<h2>Выберите новый цвет:</h2>
	<div class="grid grid-cols-3 gap-4">
		{#each colorChoices as color}
			<button
				class="flex cursor-pointer flex-col items-center p-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
				onclick={() => setNoun(color)}
			>
				<svg
					class="transition-transform duration-200 hover:scale-105"
					viewBox="0 0 100 100"
					width="80"
					height="80"
				>
					{@html currentShape.render(color.value)}
				</svg>
				<span class="mt-2 text-sm">{color.name}</span>
			</button>
		{/each}
	</div>
{/if}
