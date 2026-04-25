<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import type { TestData } from '$lib/exercises';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	// console.log(data);

	const exercises: TestData[] = data.exercises;
	const found = exercises.find((x) => x.name == data.slug);
	let title: string = $state('');
	if (found) title = found.title;
</script>

<section class="banner">
	<h1>{title}</h1>
</section>
{@render children()}
