<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutProps } from './$types';
	import type { TestData } from '$lib/exercises';

	let { data, children }: LayoutProps = $props();
	// console.log(data);

    const exercises: TestData[] = data.exercises;
	const found = exercises.find((x) => x.name == data.slug);
	let title: string = $state('');
	if (found) title = found.title;
</script>

<div class="max-xs:text-xs flex h-full min-h-0 w-full flex-col items-center justify-around px-2">
	<h1 class="max-xs:hidden xs:max-lg:landscape:hidden">
		{title}
	</h1>
	<h2 class="xs:portrait:hidden lg:landscape:hidden">
		{title}
	</h2>
	{@render children()}
</div>
