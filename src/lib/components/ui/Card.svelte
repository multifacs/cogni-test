<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, className }: { children: Snippet; className?: string } = $props();
</script>

<div
	class="flex h-fit w-fit flex-col items-center gap-4 rounded-2xl bg-white p-8 {className}"
>
	{#if children}
		{@render children()}
	{:else}
		<p>No children present</p>
	{/if}
</div>
