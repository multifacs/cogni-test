<script lang="ts">
	import { onMount } from 'svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let Component: typeof import('svelte').SvelteComponent | null = $state(null);

	onMount(async () => {
		// await delay(300);
		Component = (await import(`$lib/rhythm/About.svelte`)).default;
	});
</script>

{#if Component}
	<div
		class="scroll-container group max-xs:text-xs xs:text-base min-h-0 shrink grow-0 overflow-y-auto px-2"
	>
		<Component></Component>
		<div class="scroll-fade"></div>
	</div>
	<div
		class="	controls
  flex items-center justify-center gap-2.5"
	>
		<Button color="blue" goto={`/results`}>История</Button>
		<Button color="green" goto={`/playground`}>Начать</Button>
	</div>
{:else}
	<Spinner></Spinner>
	<p>Загрузка теста rhythm...</p>
{/if}

<style>
	.scroll-fade {
		position: sticky;
		bottom: 0;
		height: 3rem;
		background: linear-gradient(to top, var(--color-gray-800), transparent);
		pointer-events: none;
		z-index: 10;
	}

	.scroll-container {
		overflow: auto; /* or hidden */
		scrollbar-width: none;
		text-align: justify;
	}
	.scroll-container .scroll-fade {
		animation: scrolling forwards;
		animation-timeline: scroll(); /* it will consider the ancestor having overflow: auto/hidden  */
	}
	@keyframes scrolling {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
	/* https://css-tip.com/overflow-detection/ */
</style>
