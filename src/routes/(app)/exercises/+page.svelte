<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';

	let { data } = $props();
	let testSessionCounts: Record<string, number> = $state({});
	import { getContext } from 'svelte';

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

<main class="main" style="display: flex; flex-direction: column;">
	<div class="flex flex-wrap justify-between gap-5 p-2">
		{#each data.exercises as { name, title, path, img }}
			<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
		{/each}
	</div>
</main>
