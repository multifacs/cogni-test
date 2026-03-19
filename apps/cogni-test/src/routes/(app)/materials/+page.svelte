<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	export let data;
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Информационные материалы</h1>
</section>
<main class="main" style="display: flex; flex-direction: column; gap: 15px">
	<div class="flex w-full max-w-md flex-col gap-4">
		{#each data.articles as article}
			<Button color="blue" goto={`/materials/${article.slug}`}>
				{article.emoji}
				{article.title}
			</Button>
		{/each}
	</div>
</main>
<section class="low-content gap-5"></section>
