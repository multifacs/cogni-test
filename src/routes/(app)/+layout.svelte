<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { userStore } from '$lib/stores/user';
	import NavBar from '$lib/components/ui/NavBar.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	onMount(async () => {
		userStore.set(data.user);
	});
</script>

<div class="flex h-dvh w-full flex-col items-center sm:w-2xl">
	<div
		class="flex w-full flex-col items-center overflow-auto"
		style="height: calc(100dvh - 56.8px);"
	>
		{@render children()}
	</div>
	<NavBar />
</div>
