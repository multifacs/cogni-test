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

	let { data }: { data: { predictedAge: number | null } } = $props();
	const user = derived(userStore, ($userStore) => $userStore);
	const headerContext = getContext<{ value: string }>('headerText');
	let subscribed = $state(false);
	let showSpinner = $state(false);
	let subscribeError = $state('');
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

	function pluralAge(n: number): string {
		const n10 = n % 10;
		const n100 = n % 100;
		if (n10 === 1 && n100 !== 11) return 'год';
		if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'года';
		return 'лет';
	}

	// Names are stored uppercase in the DB — display as-is, no re-casing
	function displayName(str: string): string {
		return str || 'Пользователь';
	}

	function getInitials(firstname?: string, lastname?: string): string {
		const f = firstname?.[0] ?? '';
		const l = lastname?.[0] ?? '';
		const initials = (f + l).trim();
		return initials ? initials.toUpperCase() : '?';
	}

	// Deterministic pastel hue from user id — same user always gets same color
	function avatarStyle(id: string | number): string {
		let h = 0;
		for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		const hue = h % 360;
		return `--avatar-bg-color: hsl(${hue} 45% 78%); --avatar-text-color: hsl(${hue} 45% 22%);`;
	}

	async function subscribe() {
		try {
			showSpinner = true;
			subscribeError = '';
			await pushService.subscribe();
			subscribed = true;
		} catch (error) {
			console.error('Failed to subscribe:', error);
			subscribeError = 'Не удалось подписаться. Попробуйте ещё раз.';
		} finally {
			showSpinner = false;
		}
	}

	async function unsubscribe() {
		try {
			await pushService.unsubscribe();
			subscribed = false;
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
				<div class="flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
					<!-- Identity -->
					<div class="glass-card flex flex-col gap-4 p-6 sm:gap-6">
						<div class="flex items-center gap-4 sm:gap-6">
							<div
								style={avatarStyle(u.id)}
								class="flex
									h-16
									w-16
									shrink-0
									items-center
									justify-center
									rounded-[50%]
									bg-(--avatar-bg-color)
									text-2xl
									font-bold
									text-(--avatar-text-color)
									uppercase
									max-sm:h-14
									max-sm:w-14
									max-sm:text-xl
									"
							>
								{getInitials(u.firstname, u.lastname)}
							</div>
							<div class="identity-text">
								<h2 class="text-3xl font-extrabold max-sm:text-2xl">
									{displayName(u.firstname)}
									{displayName(u.lastname)}
								</h2>
								<p class="text-base opacity-80">
									{formatAge(u.birthday)}
									{pluralAge(formatAge(u.birthday))}
								</p>
							</div>
						</div>
						<p class="text-sm text-gray-500">
							Заполните анкету, чтобы сделать результаты диагностики точнее
						</p>
						<Button color="green" goto="/questionary">Перейти к анкете</Button>
					</div>

					<!-- Metrics -->
					<div
						class="grid grid-cols-[repeat(4,1fr)] gap-4 max-sm:grid-cols-[repeat(2,1fr)] sm:gap-6"
					>
						<MetricTile
							title="Когн. возраст"
							value={data.predictedAge !== null && data.predictedAge !== undefined
								? `${Math.round(data.predictedAge)} ${pluralAge(Math.round(data.predictedAge))}`
								: undefined}
						/>
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
										<p class="text-sm">Подписываемся…</p>
									</div>
								{:else}
									<Button color="green" onclick={subscribe} class="max-sm:w-full"
										>Подписаться на уведомления</Button
									>
								{/if}
							{/if}
							{#if subscribeError}
								<p class="text-sm text-red-600">{subscribeError}</p>
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
	{:catch}
		<div class="flex justify-center p-8">
			<p class="text-red-500">Не удалось загрузить профиль. Попробуйте обновить страницу.</p>
		</div>
	{/await}
</main>
