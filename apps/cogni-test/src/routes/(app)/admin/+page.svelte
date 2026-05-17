<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Admin page</h1>
</section>

<main class="main flex flex-col items-center justify-center gap-4">
	<div class="flex w-full max-w-xs flex-col gap-4">
		<Button color="green" goto="/admin/notifications">Управление уведомлениями</Button>
		<Button color="gray" goto="/admin/db">База пользователей</Button>
	</div>
</main>
<section class="low-content flex items-center justify-center">
	<p class="max-w-md text-center text-lg max-md:text-sm">Выберите, с чего начать.</p>
</section>
