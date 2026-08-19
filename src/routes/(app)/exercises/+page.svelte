<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';

	let { data } = $props();
	let testSessionCounts: Record<string, number> = $state({});
	import { getContext } from 'svelte';
	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		userStore.set(data.user || '');
		if (data.exerciseSessionCounts) {
			testSessionCounts = data.exerciseSessionCounts;
		}
		if (headerContext) {
			headerContext.value = 'Когнитивный тренажер';
		}
	});
</script>

<main class="main" style="display: flex; flex-direction: column; align-items: center;">
	<div class="content flex flex-col items-center justify-center gap-8 pt-[2%] pb-[4%]">
		<h2>Регулярные тренировки помогают поддерживать когнитивные навыки</h2>
		<RecommendationCard
			title="Диагностика когнитивного возраста"
			text="Пройдите тесты и узнайте свой возраст"
			icon="brain.svg"
			goto="/tests"
			button_text="Начать прохождение"
		/>
	</div>
	<div class="cards flex flex-wrap justify-between gap-5 p-2">
		{#each data.exercises as { name, title, path, img }}
			<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
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
		}
	}
</style>
