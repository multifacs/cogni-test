<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';
	import { getContext } from 'svelte';

	let { data } = $props();
	let exerciseSessionCounts: Record<string, number> = $state({});

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		userStore.set(data.user || '');
		if (data.exerciseSessionCounts) {
			exerciseSessionCounts = data.exerciseSessionCounts;
		}
		if (headerContext) {
			headerContext.value = 'Когнитивный тренажер';
		}
	});
</script>

<main class="main" style="display: flex; flex-direction: column; align-items: center;">
	<div
		class="content flex flex-col items-center justify-center gap-8 pt-[2%] pb-[4%] pl-[2%] pr-[2%]"
	>
		<h2 class="text-center">Регулярные тренировки помогают поддерживать когнитивные навыки</h2>
		<RecommendationCard
			title="Диагностика когнитивного возраста"
			text="Пройдите тесты и узнайте свой возраст"
			icon="/brain.svg"
			goto="/tests"
			button_text="Начать прохождение"
		/>
	</div>
	<div class="cards flex flex-wrap justify-center gap-5 p-2">
		{#each data.exercises as { name, title, path, img } (name)}
			<ExerciseCard {name} {title} {path} {img} testSessionCounts={exerciseSessionCounts} />
		{/each}
	</div>
</main>

<style>
	@media (min-width: 1024px) {
		.content {
			width: 50%;
		}
		.cards {
			padding: 2vw;
			gap: 4vw;
		}
	}
</style>
