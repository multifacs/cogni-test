<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { exerciseRegistry } from '$lib/exercises';
	import type { SvelteComponent } from 'svelte';

	const { data } = $props();
	const slug = data.slug;
	const exercise = $derived(exerciseRegistry[slug]);

	let Component: typeof SvelteComponent | null = $state(null);

	$effect(() => {
		Component = null;
		if (exercise?.result) {
			exercise.result().then((mod) => {
				Component = mod.default;
			});
		}
	});
</script>

{#if Component}
	<Component {slug} />
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner />
		<p>Загрузка результатов {slug}...</p>
	</main>
{/if}
