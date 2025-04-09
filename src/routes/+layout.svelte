<script>
	import { enhance } from '$app/forms';
	import '../app.css';
	import '@fontsource/roboto';
	import { userStore } from '$lib/stores';
	import { onMount } from 'svelte';
	import Button from '$lib/components/button.svelte';
	let { data, children } = $props();

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<form
	class="absolute top-[10px] mr-[20px] flex w-full items-center justify-end text-sm sm:m-0 sm:justify-around"
	method="POST"
	action="/?/logout"
	use:enhance
>
	<span class="hidden sm:block">User ID: {$userStore}</span>
	<Button type="submit" kind="small" color="red" disabled={$userStore == ''}>Выйти</Button>
</form>

<div
	class="container flex max-w-2xl flex-col items-center justify-center gap-2.5 p-2.5
"
>
	{@render children()}
</div>

<style>
	.container {
		/* max-width: 600px; */
		margin: 10vh auto;
		/* padding: 10px 10px; */
		/* display: flex; */
		/* flex-direction: column; */
		/* justify-content: center; Центрирование по горизонтали */
		/* align-items: center; Центрирование по вертикали */
		/* gap: 10px; */
	}
</style>
