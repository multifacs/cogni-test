<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let { category, originalAdjective, originalNoun, originalShape, originalColor, nextPhase } =
		$props();
</script>

<h2>Сочетание для запоминания:</h2>
{#if category === 'words'}
	<p class="text-3xl">{originalAdjective} {originalNoun}</p>
{:else}
	<div class="flex flex-col items-center">
		<svg class="shape-svg" viewBox="0 0 100 100" width="120" height="120">
			{@html originalShape.render(originalColor.value)}
		</svg>
		<p class="mt-2 text-xl">{originalShape.name} {originalColor.name}</p>
	</div>
{/if}
<Button color="green" onclick={nextPhase}>Далее</Button>
