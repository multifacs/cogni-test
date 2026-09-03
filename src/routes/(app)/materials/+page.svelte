<script lang="ts">
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';
	import { getContext, onMount } from 'svelte';
	export let data;

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) {
			headerContext.value = 'Статьи';
		}
	});
</script>

<main class="main flex flex-col gap-6">
	<div class="flex flex-wrap justify-between gap-5 p-2">
		{#each data.articles as article (article.slug)}
			<RecommendationCard
				title={article.title}
				text={`Время чтения: ${article.time} минут`}
				icon={article.emoji}
				goto={`/materials/${article.slug}`}
				button_text="Прочитать"
			/>
		{/each}
	</div>
</main>
