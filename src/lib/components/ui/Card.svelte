<script lang="ts">
	import type { Snippet } from "svelte";

	let { children, className }: { children: Snippet; className: string } = $props();
</script>

<div class="card {className}">
	{#if children}
		{@render children()}
	{:else}
		<p>No children present</p>
	{/if}
</div>

<style>
	.card {
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		gap: 1rem;
		width: fit-content;
		height: fit-content;
	}
</style>
