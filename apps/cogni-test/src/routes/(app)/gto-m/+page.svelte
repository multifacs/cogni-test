<script lang="ts">
    import SessionTable from '$lib/components/ui/gto-m/SessionTable.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const sessions = data.sessions;
</script>

<div class="flex flex-col items-center justify-center gap-6 p-8 text-white">
	<h2>ГТО-М</h2>
    <SessionTable {sessions} />
</div>
