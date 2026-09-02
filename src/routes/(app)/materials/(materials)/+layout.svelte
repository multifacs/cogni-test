<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { getContext, onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const headerContext = getContext<{ value: string }>('headerText');
	onMount(() => {
		if (headerContext) {
			headerContext.value = 'Статьи';
		}
	});
</script>

<main class="main flex flex-col gap-6">
	{@render children()}
</main>
