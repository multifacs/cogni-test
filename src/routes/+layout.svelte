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

<div
	class="
flex
h-[100dvh]
w-full
flex-col
items-center
justify-between
"
>
	<form
		class="
	mt-2
	flex
	w-full
	max-w-[600px]
	shrink
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
		class="
	container
	flex
	h-[90vh]
	max-w-2xl
	flex-col
	items-center
	justify-between
  	gap-1
	p-2.5
"
	>
		{@render children()}
	</div>
</div>

<style>
</style>
