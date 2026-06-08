<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { testRegistry } from '$lib/tests';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const title = $derived(testRegistry[data.slug]?.title ?? '');
</script>

<section class="banner">
	<h1>{title}</h1>
</section>
{@render children()}
