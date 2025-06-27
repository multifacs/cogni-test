<script lang="ts">
	import { onMount } from 'svelte';

	let content = $state();
	const { data } = $props();

	onMount(async () => {
		content = data.content;
	});
</script>

<main class="prose prose-invert mx-auto max-w-2xl p-6 overflow-scroll">
	{@html content}
</main>
