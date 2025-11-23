<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { userStore } from '$lib/stores/user';
	import { derived } from 'svelte/store';

	import Button from '$lib/components/ui/Button.svelte';

	import { pushService } from '$lib/pushService';
	import { isSubscribed } from '$lib/utils/push';

	const user = derived(userStore, ($userStore) => $userStore);
	let subscribed = $state(false);

	onMount(async () => {
		subscribed = await isSubscribed();
	});

	console.log($user);

	function formatBool(val: boolean | null): string {
		if (val === true) return 'Да';
		if (val === false) return 'Нет';
		return 'Не указано';
	}

	function formatSex(val: 'male' | 'female'): string {
		return val === 'male' ? 'Мужской' : 'Женский';
	}

	export function formatDate(date: Date): string {
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0'); // месяцы с 0
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}

	async function subscribe() {
		try {
			await pushService.subscribe();
			subscribed = true;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}

	async function unsubscribe() {
		try {
			await pushService.unsubscribe();
            subscribed = false;
			console.log('Unsubscribed successfully');
		} catch (error) {
			console.error('Failed to unsubscribe:', error);
		}
	}
</script>

<main class="flex h-full w-full flex-col justify-center gap-2 p-4 text-white">
	<h1 class="mb-4 text-2xl font-bold">Профиль</h1>

	{#await $user}
		<p>Загрузка...</p>
	{:then u}
		{#if u && u.id}
			<div class="rounded-xl bg-gray-700 p-4 shadow-lg">
				<p><b>ID:</b> {u.id}</p>
				<p><b>Имя:</b> {u.firstname}</p>
				<p><b>Фамилия:</b> {u.lastname}</p>
				<p><b>Дата рождения:</b> {formatDate(u.birthday)}</p>
				<p><b>Пол:</b> {formatSex(u.sex)}</p>
				<hr class="my-2 border-gray-600" />

				<div class="my-2 flex flex-col justify-center gap-2">
					<h2 class="text-2xl text-white">Управление подпиской на push-уведомления</h2>
					{#if subscribed}
						<div class="flex justify-center">
							<Button color="blue" kind="small" onclick={unsubscribe}
								>Отписаться</Button
							>
						</div>
                    {:else}
						<div class="flex justify-center">
							<Button color="green" kind="small" onclick={subscribe}
								>Подписаться</Button
							>
						</div>
					{/if}
				</div>

				<hr class="my-2 border-gray-600" />
				<form class="flex justify-center" method="POST" action="/?/logout" use:enhance>
					<div class="flex gap-2">
						<Button type="submit" kind="small" color="red">Выйти</Button>
					</div>
				</form>
			</div>
		{:else}
			<p>Пользователь не найден. Возможно, вы не вошли в систему.</p>
		{/if}
	{/await}
</main>
