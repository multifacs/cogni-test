<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	// console.log(data);
	const found = data.tests.find((x) => x.name == data.slug);
	let title: string = $state('');
	if (found) title = found.title;
</script>

<div
	class="max-xs:text-xs flex h-full min-h-0 w-full flex-col items-center justify-between gap-2 px-2"
>
	<h1 class="max-xs:hidden xs:max-lg:landscape:hidden">
		{title}
	</h1>
	<h2 class="xs:portrait:hidden lg:landscape:hidden">
		{title}
	</h2>
	{@render children()}
</div>
