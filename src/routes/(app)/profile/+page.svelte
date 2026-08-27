<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { userStore } from '$lib/stores/user';
	import { derived } from 'svelte/store';
	import Button from '$lib/components/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import Card from '$lib/components/ui/Card.svelte';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { pushService } from '$lib/pushService';
	import { isSubscribed } from '$lib/utils/push';

	let { data } = $props();
	const user = derived(userStore, ($userStore) => $userStore);
	const headerContext = getContext<{ value: string }>('headerText');
	let subscribed = $state(false);
	let showSpinner = $state(false);
	let predictedAge = $state<number | null>(null);
	onMount(async () => {
		if (headerContext) {
			headerContext.value = 'Профиль';
		}
		subscribed = await isSubscribed();

		if (data?.predictedAge !== null && data?.predictedAge !== undefined) {
			predictedAge = Math.round(data.predictedAge);
		}
	});

	function formatAge(inputDate: Date) {
		const today = new Date();
		const birthDate = new Date(inputDate);

		let age = today.getFullYear() - birthDate.getFullYear();

		const hasHadBirthdayThisYear =
			today.getMonth() > birthDate.getMonth() ||
			(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

		if (!hasHadBirthdayThisYear) {
			age--;
		}

		return age;
	}

	function formatSex(val: 'male' | 'female'): string {
		return val === 'male' ? 'Мужской' : 'Женский';
	}

	export function formatDate(date: Date): string {
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	async function subscribe() {
		try {
			showSpinner = true;
			await pushService.subscribe();
			showSpinner = false;
			subscribed = true;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
			showSpinner = false;
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

<main class="main" style="display: flex; flex-direction: column; align-items: center;">
	<div class="content flex flex-col items-center justify-center gap-15 pt-[2%] pb-[4%]">
		{#await $user}
			<div class="flex justify-center p-8">
				<p>Загрузка...</p>
			</div>
		{:then u}
			{#if u && u.id}
				<Card>
					<div class="name flex w-[45vw] flex-col items-center gap-2 p-[2%]">
						<p><b>Имя:</b> {capitalize(u.firstname)} {capitalize(u.lastname)}</p>
						<p><b>Возраст:</b> {formatAge(u.birthday)} лет</p>
					</div>
				</Card>
				<div class="flex flex-col gap-7">
					<h2>Заполните анкету, чтобы сделать результаты диагностики точнее</h2>
					<Button color="green" goto="/questionary">Перейти к анкете</Button>
				</div>
				<div class="cards flex flex-wrap justify-between gap-5 p-2">
					<InfoCard title="Когнитивный возраст" info={predictedAge} />
					<InfoCard title="Дата последней проверки" info="" />
					<InfoCard title="Пройдено тренировок" info="" />
					<InfoCard title="Серия" info="" />
				</div>
				<!--
				ПЕРСОНАЛИЗАЦИЯ
				<Card>График изменения конгитивного возраста</Card>
				<Card>
					<h2>Конитивные навыки</h2>
					<div>Восприятие</div>
					<div>Скорость реакции</div>
					<div>Исполнительные функции</div>
					<div>Оперативная память</div>
					<div>Пространственное восприятие</div>
					<div>Память</div>
				</Card> -->

				<Card>
					<div class="flex flex-row items-center gap-8">
						<h3 class="mb-4 text-center text-lg font-semibold">Уведомления</h3>
						{#if subscribed}
							<Button color="red" kind="small" onclick={unsubscribe}
								>Отписаться</Button
							>
						{:else}
							{#if showSpinner}
								<div class="flex items-center justify-center gap-2">
									<Spinner />
									<p class="text-sm">
										Перезагрузите страницу, если загрузка идет долго
									</p>
								</div>
							{:else}
								<Button color="green" kind="small" onclick={subscribe}>
									Подписаться
								</Button>
							{/if}
						{/if}
					</div>
				</Card>
				<form method="POST" action="/?/logout" use:enhance>
					<Button class="h-full w-full" type="submit" kind="small" color="red"
						>Выйти</Button
					>
				</form>
			{:else}
				<div class="flex justify-center p-8">
					<p class="text-red-500">
						Пользователь не найден. Возможно, вы не вошли в систему.
					</p>
				</div>
			{/if}
		{/await}
	</div>
</main>

<style>
	@media (min-width: 1024px) {
		.cards {
			gap: 4vw;
		}
		.name {
			width: 20vw;
		}
	}
</style>
