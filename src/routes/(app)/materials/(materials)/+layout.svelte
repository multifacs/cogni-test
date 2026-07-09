<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{@render children()}
<section class="low-content grid grid-cols-3 gap-4">
	<div></div>
	<Button color="red" goto="/materials">Назад</Button>
	<div></div>
</section>
