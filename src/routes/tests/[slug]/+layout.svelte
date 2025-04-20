<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	// console.log(data);
	const found = data.tests.find((x) => x.name == data.slug);
	let title: string = $state('');
	if (found) title = found.title;
</script>

<div class="flex flex-col min-h-0 justify-between items-center gap-2 w-full px-2 h-full max-xs:text-xs">
	<h1 class="!mt-1 max-xs:hidden">
		{title}
	</h1>
	<h2 class="!mt-1 xs:hidden">
		{title}
	</h2>
	{@render children()}
</div>
