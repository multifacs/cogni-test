<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { getContext, onMount } from 'svelte';
	export let data;

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) {
			headerContext.value = 'Статьи';
		}
	});
</script>

<main class="main flex flex-col justify-center gap-4">
	{#each data.articles as article}
		<Button color="blue" goto={`/materials/${article.slug}`}>
			{article.emoji}
			{article.title}
		</Button>
	{/each}
</main>
<section class="low-content flex items-center justify-center">
	<!-- <h1 class="text-3xl font-bold">Информационные материалы</h1> -->
	<p class="text-center text-lg max-md:text-sm">Полезные статьи для долголетия</p>
</section>
