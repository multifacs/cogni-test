<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let { category, adjectiveChoices, setAdjective, shapeChoices, originalColor } = $props();
</script>

{#if category === 'words'}
	<h2>Выберите новое прилагательное:</h2>
	<div class="grid max-w-lg grid-cols-2 gap-4">
		{#each adjectiveChoices as adj}
			<Button color="green" onclick={() => setAdjective(adj)}>{adj}</Button>
		{/each}
	</div>
{:else}
	<h2>Выберите новую фигуру:</h2>
	<div class="grid grid-cols-3 gap-4">
		{#each shapeChoices as shape}
			<button
				class="flex cursor-pointer flex-col items-center p-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
				onclick={() => setAdjective(shape)}
			>
				<svg
					class="transition-transform duration-200 hover:scale-105"
					viewBox="0 0 100 100"
					width="80"
					height="80"
				>
					{@html shape.render(originalColor.value)}
				</svg>
				<span class="mt-2 text-sm">{shape.name}</span>
			</button>
		{/each}
	</div>
{/if}
