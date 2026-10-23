<script>
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/state';
	import { withFromAi } from '$lib/ai/flow';
</script>

<main class="main flex flex-col items-center justify-center gap-4">
	<p>Тест не найден</p>
</main>

<section class="low-content grid grid-cols-1">
	<Button color="red" goto={withFromAi('/tests', page.url)}>Назад к тестам</Button>
</section>
