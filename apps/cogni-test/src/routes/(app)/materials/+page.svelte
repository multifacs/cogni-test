<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	export let data;
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Информационные материалы</h1>
</section>
<main class="main flex flex-col gap-4 justify-center">
	{#each data.articles as article}
		<Button color="blue" goto={`/materials/${article.slug}`}>
			{article.emoji}
			{article.title}
		</Button>
	{/each}
</main>
<section class="low-content">
	<!-- <h1 class="text-3xl font-bold">Информационные материалы</h1> -->
</section>