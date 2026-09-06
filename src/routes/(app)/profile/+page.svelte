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

<main class="main profile-main">
	{#await $user}
		<div class="flex justify-center p-8">
			<p>Загрузка...</p>
		</div>
	{:then u}
		{#if u && u.id}
			<div class="glass-scene">
				<!-- <div class="glass-bg" aria-hidden="true">
					<div class="glass-blob glass-blob--top"></div>
					<div class="glass-blob glass-blob--bottom"></div>
				</div> -->

				<div class="profile-content">
					<!-- Identity -->
					<div class="glass-card identity-card">
						<div class="identity-row">
							<div class="avatar">{getInitials(u.firstname, u.lastname)}</div>
							<div class="identity-text">
								<h2 class="profile-name">{capitalize(u.firstname)} {capitalize(u.lastname)}</h2>
								<p class="profile-age">{formatAge(u.birthday)} лет</p>
							</div>
						</div>
						<p class="profile-hint">
							Заполните анкету, чтобы сделать результаты диагностики точнее
						</p>
						<Button color="green" goto="/questionary">Перейти к анкете</Button>
					</div>

					<!-- Metrics -->
					<div class="metrics-grid">
						<div class="glass-card metric-tile">
							<div class="metric-title">Когн. возраст</div>
							<div class="metric-value">{predictedAge ?? '—'}</div>
							{#if predictedAge == null}
								<div class="metric-caption">нет данных</div>
							{/if}
						</div>
						<div class="glass-card metric-tile">
							<div class="metric-title">Дата проверки</div>
							<div class="metric-value">—</div>
							<div class="metric-caption">нет данных</div>
						</div>
						<div class="glass-card metric-tile">
							<div class="metric-title">Тренировок</div>
							<div class="metric-value">—</div>
							<div class="metric-caption">нет данных</div>
						</div>
						<div class="glass-card metric-tile">
							<div class="metric-title">Серия</div>
							<div class="metric-value">—</div>
							<div class="metric-caption">нет данных</div>
						</div>
					</div>

					<!-- Settings -->
					<div class="glass-card settings-card">
						<h3>Уведомления</h3>
						<div class="settings-actions">
							{#if subscribed}
								<Button
									color="secondary"
									class="border border-gray-300"
									onclick={unsubscribe}
								>
									Отписаться
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
							<button type="submit" class="glass-ghost-btn">Выйти</button>
						</form>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex justify-center p-8">
				<p class="text-red-500">
					Пользователь не найден. Возможно, вы не вошли в систему.
				</p>
			</div>
		{/if}
	{/await}
</main>

<style>
	.profile-main {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.glass-scene {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.profile-content {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.identity-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
	}

	.identity-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		background: var(--main-accent-color);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.profile-name {
		font-weight: 800;
		font-size: 1.75rem;
		line-height: 1.2;
	}

	.profile-age {
		font-size: 1rem;
		opacity: 0.8;
	}

	.profile-hint {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.metric-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		text-align: center;
		gap: 0.25rem;
	}

	.metric-title {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.metric-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.metric-caption {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.settings-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
	}

	.settings-card h3 {
		text-align: left;
	}

	.settings-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.glass-ghost-btn {
		align-self: flex-start;
	}

	@media (max-width: 639px) {
		.profile-content {
			padding: 1rem;
			gap: 1rem;
		}

		.identity-card,
		.settings-card {
			padding: 1.25rem;
		}

		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.profile-name {
			font-size: 1.5rem;
		}

		.avatar {
			width: 3.5rem;
			height: 3.5rem;
			font-size: 1.25rem;
		}
	}
</style>
