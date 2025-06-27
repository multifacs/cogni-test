<script lang="ts">
	import { enhance } from '$app/forms';
	import '../app.css';
	import '@fontsource/roboto';
	import { userStore } from '$lib/stores/user';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import UserBadge from '$lib/components/ui/UserBadge.svelte';
	import NotificationToggle from '$lib/components/NotificationToggle.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	let { data, children } = $props();
</script>

<div class="flex h-[100dvh] flex-col items-center justify-between gap-2 p-2 sm:w-2xl">
	<form
		class="xs:max-lg:landscape:hidden flex w-[100vw] items-center justify-between px-2 text-sm sm:w-2xl"
		method="POST"
		action="/?/logout"
		use:enhance
	>
		<UserBadge></UserBadge>

		<div class="flex gap-2">
			<NotificationToggle />
			<Button type="submit" kind="small" color="red">Выйти</Button>
		</div>
	</form>

	{@render children()}

	<!-- Нижний блок — ссылка или футер -->
	<div class="xs:max-lg:landscape:hidden text-sm">
		<p>
			Сообщить о проблеме: <a href={data.TG_GROUP_LINK} class=" font-bold text-sky-500">Telegram</a>
		</p>
	</div>
	<NavBar />
</div>
