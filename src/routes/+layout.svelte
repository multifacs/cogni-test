<script>
	import { enhance } from '$app/forms';
	import '../app.css';
	import '@fontsource/roboto';
	import { userStore } from '$lib/stores/user';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IdBadge from '$lib/components/ui/IdBadge.svelte';
	let { data, children } = $props();

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<form
	class="absolute
	top-[10px]
	flex
	w-full
	max-w-[350px]
	min-w-[300px]
	shrink-1
	items-center
	justify-between
	px-2
	text-sm
	sm:max-w-2xl"
	method="POST"
	action="/?/logout"
	use:enhance
>
	<IdBadge userId={$userStore}></IdBadge>
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
		/* margin: 10vh auto; */
		/* padding: 10px 10px; */
		/* display: flex; */
		/* flex-direction: column; */
		/* justify-content: center; Центрирование по горизонтали */
		/* align-items: center; Центрирование по вертикали */
		/* gap: 10px; */
	}
</style>
