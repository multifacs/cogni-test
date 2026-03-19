<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{@render children()}
<section class="low-content flex justify-center align-middle">
	<Button color="red" goto="/materials">Назад</Button>
</section>
