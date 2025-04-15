<script lang="ts">
	import { onMount } from 'svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { delay } from '$lib/utils/common.js';
	import Button from '$lib/components/ui/Button.svelte';

	const { data } = $props();
	const slug = data.slug;
	let Component: typeof import('svelte').SvelteComponent | null = $state(null);

	onMount(async () => {
		// await delay(300);
		Component = (await import(`$lib/tests/${slug}/About.svelte`)).default;
	});
</script>

{#if Component}
	<div
		class="	scroll-container
  group relative max-h-[60vh] shrink overflow-y-auto px-2"
	>
		<Component></Component>
		<div class="scroll-fade"></div>
	</div>
	<div
		class="	controls
  flex items-center justify-center gap-2.5"
	>
		<Button color="green" goto={`/tests/${slug}/playground`}>Начать</Button>
		<Button color="red" goto="/">Назад</Button>
		<Button color="blue" goto={`/tests/${slug}/results`}>История</Button>
	</div>
{:else}
	<Spinner></Spinner>
	<p>Загрузка теста {slug}...</p>
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
