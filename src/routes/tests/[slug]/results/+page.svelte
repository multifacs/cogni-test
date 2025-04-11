<script lang="ts">
	import { onMount } from 'svelte';

	const { data } = $props();
	const slug = data.slug;
	let Component: typeof import('svelte').SvelteComponent | null = $state(null);

	onMount(async () => {
		Component = (await import(`$lib/tests/${slug}/Results.svelte`)).default;
	});
</script>

{#if Component}
	<Component></Component>
{:else}
	<p>Загрузка результатов...</p>
{/if}
