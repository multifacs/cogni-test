<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';
	import NavBar from '$lib/components/NavBar.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	onMount(() => {
		userStore.set(data.user);
	});
</script>

<div class="flex h-[100dvh] flex-col items-center justify-between gap-2 p-2 sm:w-2xl">
	{@render children()}
	<NavBar />
</div>
