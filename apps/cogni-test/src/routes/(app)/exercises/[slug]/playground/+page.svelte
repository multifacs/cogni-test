<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import type { MetaResult, RegularResult, TestResultMap } from '$lib/tests/types.js';
	import type { Result } from '$lib/types/index.js';
	import { delay } from '$lib/utils/common.js';
	import { onMount, type SvelteComponent } from 'svelte';

	const { data } = $props();
	// console.log('playground data ', data);
	const slug = data.slug;
	let Component: typeof SvelteComponent | null = $state(null);

	// let componentRef: InstanceType<typeof SvelteComponent> | null = $state(null);

	let isGameRunning = $state(true);
	let isGameEnd = $state(false);
	let childComponent: InstanceType<typeof SvelteComponent> | null = $state(null);

	onMount(async () => {
		Component = (await import(`$lib/exercises/${slug}/Playground.svelte`)).default;
	});

	function onGameEnd() {
		isGameRunning = false;
		isGameEnd = true;
		goto(`/exercises/${slug}/about`);
	}

</script>

{#if Component}
	<Component bind:this={childComponent} gameEnd={onGameEnd} {data}
	></Component>
	<div class="controls flex items-center justify-center gap-2.5">
		<Button color="red" goto={`/exercises/${slug}`}>Назад</Button>
	</div>
{:else}
	<p>Загрузка логики теста...</p>
{/if}
