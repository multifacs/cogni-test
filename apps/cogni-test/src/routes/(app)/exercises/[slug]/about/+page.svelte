<script lang="ts">
	import { onMount } from 'svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { delay } from '$lib/utils/common.js';
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/state';

	const { data } = $props();
	const slug = data.slug;
	let Component: typeof import('svelte').SvelteComponent | null = $state(null);

	onMount(async () => {
		// await delay(300);
		Component = (await import(`$lib/exercises/${slug}/About.svelte`)).default;
	});
</script>

{#if Component}
	<!-- <main class="main text-justify"> -->
	<main class="main flex flex-col items-center gap-4 text-justify">
		<Component></Component>
		<!-- <div class="scroll-fade"></div> -->
	</main>

	{#if page.url.pathname.includes('road-trip') || page.url.pathname.includes('not-lost')}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto="/exercises">Назад</Button>
			<div></div>
		</section>
	{:else}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto="/exercises">Назад</Button>
			<Button color="green" goto={`/exercises/${slug}/playground`}>Начать</Button>
		</section>
	{/if}
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка упражнения {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto="/exercises">Назад</Button>
	</section>
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
		animation-timeline: scroll(

		); /* it will consider the ancestor having overflow: auto/hidden  */
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
