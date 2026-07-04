<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
	<div class="flex w-full flex-col">
		{@render children()}
	</div>
</div>
