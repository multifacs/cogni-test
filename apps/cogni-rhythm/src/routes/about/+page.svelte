<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import About from '$lib/rhythm/About.svelte';
</script>

<div
	class="scroll-container group max-xs:text-xs xs:text-base min-h-0 shrink grow-0 overflow-y-auto px-2"
>
	<About></About>
	<div class="scroll-fade"></div>
</div>
<div
	class="	controls
  flex items-center justify-center gap-2.5"
>
	<Button color="blue" goto={`/results`}>История</Button>
	<Button color="green" goto={`/playground`}>Начать</Button>
</div>

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
