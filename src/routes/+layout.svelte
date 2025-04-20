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

<div class="flex h-[100dvh] flex-col items-center justify-between p-2 sm:w-2xl gap-2">
	<form
		class="flex w-[100vw] items-center justify-between px-2 text-sm sm:w-2xl"
		method="POST"
		action="/?/logout"
		use:enhance
	>
		<IdBadge userId={$userStore}></IdBadge>
		<Button type="submit" kind="small" color="red" disabled={$userStore == ''}>Выйти</Button>
	</form>

	{@render children()}

	<!-- Нижний блок — ссылка или футер -->
	<div class="text-sm">
		<p>
			Сообщить о проблеме: <a href={data.TG_GROUP_LINK} class=" font-bold text-sky-500">Telegram</a>
		</p>
	</div>
</div>

<style>
</style>
