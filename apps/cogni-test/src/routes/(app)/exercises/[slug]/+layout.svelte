<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { exerciseRegistry } from '$lib/exercises';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const title = $derived(exerciseRegistry[data.slug]?.title ?? '');
</script>

<section class="banner">
	<h1>{title}</h1>
</section>
{@render children()}
