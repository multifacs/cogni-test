<script lang="ts">
	import AdminNavbar from '$lib/components/ui/admin/AdminNavbar.svelte';

	let { children } = $props();
</script>

<div class="flex h-dvh w-full flex-col items-center sm:w-2xl">
	{@render children()}
	<AdminNavbar />
</div>
