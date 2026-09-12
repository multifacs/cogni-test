<script lang="ts">
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';
	import { getContext, onMount } from 'svelte';
	import { articles } from '$lib/articles';

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) {
			headerContext.value = 'Статьи';
		}
	});
</script>

<main class="main flex w-full flex-col items-center justify-center-safe">
	<div class="flex w-full max-w-5xl flex-col items-center justify-center-safe gap-4 sm:gap-6">
		{#each articles as article (article.slug)}
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
