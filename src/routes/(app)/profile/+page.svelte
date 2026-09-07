<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { userStore } from '$lib/stores/user';
	import { derived } from 'svelte/store';
	import Button from '$lib/components/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { pushService } from '$lib/pushService';
	import { isSubscribed } from '$lib/utils/push';
	import MetricTile from './components/MetricTile.svelte';

	// let { data } = $props();
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

	export function formatDate(date: Date): string {
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	function getInitials(firstname?: string, lastname?: string): string {
		const f = firstname?.[0] ?? '';
		const l = lastname?.[0] ?? '';
		const initials = (f + l).trim();
		return initials ? initials.toUpperCase() : '?';
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

<main class="main flex flex-col items-center justify-center-safe">
	{#await $user}
		<div class="flex justify-center p-8">
			<p>Загрузка...</p>
		</div>
	{:then u}
		{#if u && u.id}
			<div class="flex w-full flex-col items-center justify-center">
				<div class="mx-0 flex w-full max-w-5xl flex-col gap-6">
					<!-- Identity -->
					<div class="glass-card flex flex-col gap-4 p-6">
						<div class="flex items-center gap-4">
							<div
								class="flex
										h-16
										w-16
										shrink-0
										items-center
										justify-center
										rounded-[50%]
										bg-(--main-accent-color)
										text-2xl
										font-bold
										text-white
										uppercase
										max-sm:h-14
										max-sm:w-14
										max-sm:text-xl
										"
							>
								{getInitials(u.firstname, u.lastname)}
							</div>
							<div class="identity-text">
								<h2 class="text-3xl leading-4 font-extrabold max-sm:text-2xl">
									{capitalize(u.firstname)}
									{capitalize(u.lastname)}
								</h2>
								<p class="text-base opacity-80">{formatAge(u.birthday)} лет</p>
							</div>
						</div>
						<p class="text-sm text-gray-500">
							Заполните анкету, чтобы сделать результаты диагностики точнее
						</p>
						<Button color="green" goto="/questionary">Перейти к анкете</Button>
					</div>

					<!-- Metrics -->
					<div
						class="grid grid-cols-[repeat(4,1fr)] gap-4 max-sm:grid-cols-[repeat(2,1fr)]"
					>
						<MetricTile title="Когн. возраст" value={predictedAge} />
						<MetricTile title="Дата проверки" />
						<MetricTile title="Тренировок" />
						<MetricTile title="Серия" />
					</div>

					<!-- Settings -->
					<div class="glass-card flex w-full justify-between gap-4 p-6 max-sm:flex-col">
						<div class="flex items-center gap-3 max-sm:w-full">
							{#if subscribed}
								<Button color="blue" onclick={unsubscribe} class="max-sm:w-full">
									Отписаться от уведомлений
								</Button>
							{:else}
								{#if showSpinner}
									<div class="flex items-center justify-center gap-2">
										<Spinner />
										<p class="text-sm">
											Перезагрузите страницу, если загрузка идет долго
										</p>
									</div>
								{:else}
									<Button color="green" onclick={subscribe}>Подписаться</Button>
								{/if}
							{/if}
						</div>
						<form method="POST" action="/?/logout" use:enhance>
							<Button color="red" class="max-sm:w-full" type="submit">Выйти</Button>
						</form>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex justify-center p-8">
				<p class="text-red-500">Пользователь не найден. Возможно, вы не вошли в систему.</p>
			</div>
		{/if}
	{/await}
</main>
