<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	export let data;
</script>

<main class="flex flex-col items-center justify-center gap-6 p-8 text-white">
	<h1 class="text-2xl font-bold">📚 Информационные материалы</h1>

	<div class="flex w-full max-w-md flex-col gap-4">
		{#each data.articles as article}
			<Button color="blue" goto={`/materials/${article.slug}`}>
				{article.emoji}
				{article.title}
			</Button>
		{/each}
	</div>
</main>
