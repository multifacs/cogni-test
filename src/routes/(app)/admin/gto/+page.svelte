<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { missingFieldLabels } from '$lib/survey-field-labels';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let selectedUsers = $state<Set<string>>(new Set());

	// Default session name with current date/time
	const now = new Date();
	const dd = String(now.getDate()).padStart(2, '0');
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const yy = String(now.getFullYear()).slice(2);
	const hh = String(now.getHours()).padStart(2, '0');
	const min = String(now.getMinutes()).padStart(2, '0');
	let sessionName = $state(`Сессия ГТО-М ${dd}/${mm}/${yy} ${hh}-${min}`);

	function toggleUser(id: string) {
		if (selectedUsers.has(id)) {
			selectedUsers.delete(id);
		} else {
			selectedUsers.add(id);
		}
		selectedUsers = new Set(selectedUsers); // trigger reactivity
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString('ru-RU');
	}

	// Search and filter
	let searchQuery = $state('');
	let filterRecent = $state(false);

	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	let filteredUsers = $derived(
		data.users.filter((u) => {
			const q = searchQuery.toLowerCase().trim();
			if (q) {
				const text =
					`${u.firstname} ${u.lastname} ${u.id} ${u.sex === 'male' ? 'М' : 'Ж'} ${u.missingSurveyFields.length} ${u.gtoId || ''}`.toLowerCase();
				if (!text.includes(q)) return false;
			}
			if (filterRecent) {
				if (!u.lastActiveAt) return false;
				const la = new Date(u.lastActiveAt);
				if (la < sevenDaysAgo) return false;
			}
			return true;
		})
	);

	// Session creation state
	let isCreating = $state(false);
	let createError = $state<string | null>(null);

	async function handleCreateSession(form: HTMLFormElement) {
		isCreating = true;
		createError = null;
		try {
			const fd = new FormData(form);
			await fetch('?/create', { method: 'POST', body: fd });
			selectedUsers = new Set();
			await invalidateAll();
		} catch {
			createError = 'Ошибка создания сессии';
		} finally {
			isCreating = false;
		}
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Управление сессиями ГТО-М</h1>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-6">
		<!-- Existing sessions -->
		<div class="flex flex-col gap-3">
			<h2 class="text-xl font-semibold">Существующие сессии</h2>
			{#if data.sessions.length === 0}
				<div class="flex flex-col items-center gap-2 py-6 text-gray-400">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-10 w-10 opacity-40"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
					<p>Нет созданных сессий</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
					{#each data.sessions as s}
						<a
							href="/admin/gto/{s.id}"
							class="group flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 p-3 transition-colors hover:border-gray-600 hover:bg-gray-700/50"
						>
							<div class="flex min-w-0 flex-col">
								<span class="truncate font-medium">{s.name}</span>
								<span class="text-xs opacity-50">{formatDate(s.createdAt)}</span>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<span
									class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs {s.status ===
									'active'
										? 'bg-green-800/60 text-green-200'
										: s.status === 'paused'
											? 'bg-yellow-800/60 text-yellow-200'
											: 'bg-gray-600/60 text-gray-300'}"
								>
									<span
										class="h-1.5 w-1.5 rounded-full {s.status === 'active'
											? 'bg-green-400'
											: s.status === 'paused'
												? 'bg-yellow-400'
												: 'bg-gray-400'}"
									></span>
									{s.status === 'active'
										? 'Активна'
										: s.status === 'paused'
											? 'На паузе'
											: 'Завершена'}
								</span>
								<span class="text-xs opacity-50">{s.participantCount} чел.</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Link to word sets -->
		<a
			href="/admin/gto/word-sets"
			class="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/30 p-4 transition-colors hover:border-gray-600 hover:bg-gray-700/30"
		>
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					/>
				</svg>
				<div class="flex flex-col">
					<span class="font-medium">Сеты слов</span>
					<span class="text-xs text-gray-400"
						>Создание, редактирование и генерация сетов</span
					>
				</div>
			</div>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 text-gray-500"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
					clip-rule="evenodd"
				/>
			</svg>
		</a>

		<!-- Create session form -->
		<form
			class="flex flex-col gap-4 rounded-xl border border-gray-700 bg-gray-800/30 p-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleCreateSession(e.currentTarget);
			}}
		>
			<h2 class="text-xl font-semibold">Создать сессию</h2>

			{#if createError}
				<p class="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">{createError}</p>
			{/if}

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-gray-300">Название сессии</span>
				<input
					type="text"
					name="name"
					bind:value={sessionName}
					class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
				/>
			</label>

			<!-- Hidden inputs for selected users -->
			{#each Array.from(selectedUsers) as userId}
				<input type="hidden" name="participantIds" value={userId} />
			{/each}

			<!-- Participant selection -->
			<div class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center gap-3">
					<h3 class="text-lg font-medium">Участники</h3>
					<span class="text-sm text-gray-400">({selectedUsers.size} выбрано)</span>
					<div class="flex-1"></div>
					<Button
						color="green"
						type="submit"
						disabled={selectedUsers.size === 0 || isCreating}
						class="shrink-0"
					>
						{isCreating ? 'Создание...' : `Создать (${selectedUsers.size})`}
					</Button>
					<div class="relative">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
								clip-rule="evenodd"
							/>
						</svg>
						<input
							type="text"
							placeholder="Поиск..."
							bind:value={searchQuery}
							class="rounded-lg bg-gray-700 py-2 pl-8 pr-3 text-sm"
						/>
					</div>
					<label class="flex items-center gap-1.5 text-sm">
						<input type="checkbox" bind:checked={filterRecent} class="rounded" />
						Недавно вошедшие
					</label>
				</div>

				{#if filteredUsers.length === 0}
					<p class="py-4 text-center text-sm text-gray-400">
						{searchQuery || filterRecent
							? 'Пользователи не найдены'
							: 'Нет авторизованных пользователей'}
					</p>
				{:else}
					<div class="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
						{#each filteredUsers as u (u.id)}
							<button
								type="button"
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors {selectedUsers.has(
									u.id
								)
									? 'bg-indigo-900/40 ring-1 ring-indigo-500/50'
									: 'bg-gray-900/30 hover:bg-gray-700/50'}"
								onclick={() => toggleUser(u.id)}
							>
								<div
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded border {selectedUsers.has(
										u.id
									)
										? 'border-indigo-400 bg-indigo-500'
										: 'border-gray-500'}"
								>
									{#if selectedUsers.has(u.id)}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5 text-white"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{/if}
								</div>
								<div class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-sm font-medium"
										>{u.firstname} {u.lastname}</span
									>
									<span class="text-xs text-gray-400">
										{u.sex === 'male' ? 'М' : 'Ж'}
										{#if u.gtoId}
											· ГТО-М: {u.gtoId}
										{/if}
									</span>
								</div>
								<div class="flex shrink-0 items-center gap-1.5">
									{#if u.missingSurveyFields.length > 0}
										<span
											class="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300"
											title={missingFieldLabels(u.missingSurveyFields)}
										>
											{u.missingSurveyFields.length}
										</span>
									{:else}
										<span
											class="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-300"
											>✓</span
										>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<Button color="green" type="submit" disabled={selectedUsers.size === 0 || isCreating}>
				{isCreating ? 'Создание...' : `Создать сессию (${selectedUsers.size} участников)`}
			</Button>
		</form>
	</div>
</main>

<section class="low-content flex items-center justify-center gap-3">
	<Button color="blue" goto="/admin/gto/word-sets">Сеты слов</Button>
	<Button color="red" goto="/admin">Админка</Button>
</section>
