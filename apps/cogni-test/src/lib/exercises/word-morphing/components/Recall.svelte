<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';

	let {
		category,
		input1 = $bindable(),
		input2 = $bindable(),
		input3 = $bindable(),
		onFinishRecall
	} = $props();
</script>

<h2>Вспомните все три сочетания:</h2>
<div class="flex w-9/12 flex-col gap-2">
	{#if category === 'words'}
		<TextInput plain name="input1" bind:value={input1} placeholder="1. Исходное" />

		<TextInput
			plain
			name="input2"
			bind:value={input2}
			placeholder="2. С заменой прилагательного"
		/>

		<TextInput
			plain
			name="input3"
			bind:value={input3}
			placeholder="3. С заменой прил. и сущ."
		/>
	{:else}
		<TextInput
			plain
			name="input1"
			bind:value={input1}
			placeholder="1. Исходная фигура и цвет"
		/>

		<TextInput plain name="input2" bind:value={input2} placeholder="2. С заменой фигуры" />

		<TextInput
			plain
			name="input3"
			bind:value={input3}
			placeholder="3. С заменой фигуры и цвета"
		/>
	{/if}
</div>

<Button color="blue" onclick={onFinishRecall}>Показать результат</Button>
