<script>
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<h1>Test not found</h1>
<Button
	color="red"
	onclick={() => {
		goto('/exercises');
	}}
>
	Назад к тестам
</Button>
