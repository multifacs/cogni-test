<script lang="ts">
	import { onMount } from 'svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { delay } from '$lib/utils/common.js';
	import Button from '$lib/components/ui/Button.svelte';

	const { data } = $props();
	const slug = data.slug;
	let Component: typeof import('svelte').SvelteComponent | null = $state(null);

	onMount(async () => {
		await delay(300);
		Component = (await import(`$lib/tests/${slug}/About.svelte`)).default;
	});
</script>

{#if Component}
	<Component></Component>
	<div class="controls flex items-center justify-center gap-2.5">
		<Button color="green" goto={`/tests/${slug}/playground`}>К тесту</Button>
		<Button color="red" goto="/">Назад</Button>
		<Button color="blue" goto={`/tests/${slug}/results`}>История</Button>
	</div>
{:else}
	<Spinner></Spinner>
	<p>Загрузка теста {slug}...</p>
{/if}

<style>
</style>
