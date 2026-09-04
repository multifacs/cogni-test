<script lang="ts">
	import { getContext, onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { testRegistry } from '$lib/tests';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const title = $derived(testRegistry[data.slug]?.title ?? '');
	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) {
			headerContext.value = title;
		}
	});
</script>

{@render children()}
