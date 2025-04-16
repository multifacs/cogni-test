<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	// console.log(data);
	const found = data.tests.find((x) => x.name == data.slug);
	let title: string = $state('');
	if (found) title = found.title;
</script>

<h1 class="!mt-1">
	{title}
</h1>
{@render children()}
