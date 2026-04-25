<script>
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<main class="main flex flex-col items-center justify-center gap-4">
	<p>Тест не найден</p>
</main>

<section class="low-content grid grid-cols-1">
	<Button color="red" goto={`/tests`}>Назад к тестам</Button>
</section>
