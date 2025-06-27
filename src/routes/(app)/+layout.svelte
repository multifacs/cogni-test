<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	onMount(() => {
		userStore.set(data.user);
	});
</script>

{@render children()}
