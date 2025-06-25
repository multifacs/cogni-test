<script>
	import Button from '$lib/components/ui/Button.svelte';
</script>

<main class="flex flex-col items-center justify-center gap-6 p-8 text-white">
	<h1 class="text-3xl font-bold">Добро пожаловать!</h1>
	<p class="max-w-md text-center text-lg">Выберите, с чего начать:</p>

	<div class="flex w-full max-w-xs flex-col gap-4">
		<Button color="green" goto="/tests">🧪 Пройти тесты</Button>
		<Button color="blue" goto="/materials">📚 Информационные материалы</Button>
		<Button color="gray" goto="/results">📊 Посмотреть результаты</Button>
	</div>
</main>
