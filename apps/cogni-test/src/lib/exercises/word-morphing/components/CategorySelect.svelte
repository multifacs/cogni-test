<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let { selectCategory } = $props();
</script>

<h2>Выберите категорию:</h2>
<div class="flex flex-wrap justify-center gap-4">
	<Button color="green" onclick={() => selectCategory('words')}>Слова</Button>
	<Button color="blue" onclick={() => selectCategory('shapes')}>Фигуры</Button>
</div>
