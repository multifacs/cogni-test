<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { missingFieldLabels } from '$lib/survey-field-labels';
	import { invalidateAll } from '$app/navigation';
	import * as XLSX from 'xlsx';
	import type { PageProps } from './$types';
	import type {
		GtoEditableMetricDetail,
		ParticipantMetrics
	} from '$lib/server/db/controllers/gto';

	let { data }: PageProps = $props();
	let editingName = $state(false);
	let sessionName = $state(data.session.name);
	let savingMetrics = $state<Set<string>>(new Set());
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'error' | 'success' | 'info'>('info');
	let expandedParticipant = $state<string | null>(null);
	let addingParticipant = $state(false);
	let participantSearch = $state('');
	let filterRecent = $state(false);
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	let metricsSearch = $state('');
	let menuOpen = $state(false);
	let removingParticipant = $state<string | null>(null);

	function closeMenuOutside(e: MouseEvent) {
		if (menuOpen && !(e.target as HTMLElement).closest('.session-menu')) {
			menuOpen = false;
		}
	}

	function showToast(message: string, type: 'error' | 'success' | 'info' = 'error') {
		toastMessage = message;
		toastType = type;
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('ru-RU');
	}

	function fmt(val: number | null, decimals = 2): string {
		if (val === null) return '—';
		return val.toFixed(decimals);
	}

	function pct(val: number): string {
		return (val * 100).toFixed(1) + '%';
	}

	const balanceTestOptions = ['0-15', '15-30', '30-45', '45-60', '60+'] as const;

	async function refreshData() {
		await invalidateAll();
	}

	async function handleRename() {
		const fd = new FormData();
		fd.set('action', 'rename');
		fd.set('name', sessionName);
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка переименования');
			return;
		}
		editingName = false;
		await refreshData();
	}

	async function handleComplete() {
		const fd = new FormData();
		fd.set('action', 'complete');
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка завершения сессии');
			return;
		}
		menuOpen = false;
		await refreshData();
	}

	async function handlePause() {
		const fd = new FormData();
		fd.set('action', 'pause');
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка приостановки сессии');
			return;
		}
		menuOpen = false;
		await refreshData();
	}

	async function handleResume() {
		const fd = new FormData();
		fd.set('action', 'resume');
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка возобновления сессии');
			return;
		}
		menuOpen = false;
		await refreshData();
	}

	async function handleRestore() {
		const fd = new FormData();
		fd.set('action', 'resume');
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка восстановления сессии');
			return;
		}
		showToast('Сессия восстановлена', 'success');
		menuOpen = false;
		await refreshData();
	}

	async function assignWordSet(participantId: string, wordSetId: string) {
		const fd = new FormData();
		fd.set('action', 'assignWordSet');
		fd.set('participantId', participantId);
		fd.set('wordSetId', wordSetId);
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка назначения сета слов');
		} else {
			showToast('Сет слов назначен', 'success');
			await refreshData();
		}
	}

	async function handleAddParticipant(userId: string) {
		const fd = new FormData();
		fd.set('action', 'addParticipant');
		fd.set('userId', userId);
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка добавления участника');
		} else {
			showToast('Участник добавлен', 'success');
			participantSearch = '';
			await refreshData();
		}
	}

	async function handleRemoveParticipant(participantId: string) {
		const fd = new FormData();
		fd.set('action', 'removeParticipant');
		fd.set('participantId', participantId);
		const response = await fetch('', { method: 'PATCH', body: fd });
		if (!response.ok) {
			showToast('Ошибка удаления участника');
		} else {
			showToast('Участник удалён', 'success');
			removingParticipant = null;
			expandedParticipant = null;
			await refreshData();
		}
	}

	async function handleSaveMetrics(participantId: string, metrics: Record<string, string>) {
		const fd = new FormData();
		fd.set('action', 'updateMetrics');
		fd.set('participantId', participantId);
		for (const [key, value] of Object.entries(metrics)) {
			if (value) fd.set(key, value);
		}
		savingMetrics = new Set([...savingMetrics, participantId]);
		try {
			const response = await fetch('', { method: 'PATCH', body: fd });
			if (!response.ok) {
				showToast('Ошибка сохранения метрик');
			} else {
				showToast('Метрики сохранены', 'success');
				await refreshData();
			}
		} catch {
			showToast('Ошибка сохранения метрик');
		} finally {
			savingMetrics = new Set([...savingMetrics].filter((id) => id !== participantId));
		}
	}

	async function exportMetrics(metrics: ParticipantMetrics[], outputName: string) {
		try {
			const responce = await fetch('', {
				method: 'POST',
				body: JSON.stringify(metrics),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const workbook = await responce.json();

			XLSX.writeFile(workbook, `${outputName}.xlsx`, { compression: true });
		} catch {
			showToast('Ошибка экспорта результатов');
		}
	}

	const statusConfig = {
		active: {
			label: 'Активна',
			bg: 'bg-green-800/60',
			text: 'text-green-200',
			dot: 'bg-green-400'
		},
		paused: {
			label: 'На паузе',
			bg: 'bg-yellow-800/60',
			text: 'text-yellow-200',
			dot: 'bg-yellow-400'
		},
		completed: {
			label: 'Завершена',
			bg: 'bg-gray-600/60',
			text: 'text-gray-300',
			dot: 'bg-gray-400'
		}
	} as const;

	let statusStyle = $derived(
		statusConfig[data.session.status as keyof typeof statusConfig] ?? statusConfig.completed
	);

	let currentParticipantIds = $derived(new Set(data.session.participants.map((p) => p.userId)));

	let availableUsers = $derived(
		data.authorizedUsers
			.filter((u) => !currentParticipantIds.has(u.id))
			.filter((u) => {
				if (filterRecent) {
					if (!u.lastActiveAt) return false;
					const la = new Date(u.lastActiveAt);
					if (la < sevenDaysAgo) return false;
				}
				if (!participantSearch) return true;
				const q = participantSearch.toLowerCase();
				return (
					u.lastname.toLowerCase().includes(q) ||
					u.firstname.toLowerCase().includes(q) ||
					(u.gtoId ?? '').toLowerCase().includes(q)
				);
			})
	);

	let filteredMetrics = $derived(
		data.metrics.filter((m) => {
			if (!metricsSearch) return true;
			const q = metricsSearch.toLowerCase();
			return (
				m.firstname.toLowerCase().includes(q) ||
				m.lastname.toLowerCase().includes(q) ||
				(data.gtoIdMap.get(m.userId) ?? '').toLowerCase().includes(q)
			);
		})
	);
</script>

<svelte:window onclick={closeMenuOutside} />

<section class="banner">
	<div class="flex items-center justify-center gap-3">
		{#if editingName}
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={sessionName}
					class="rounded-lg bg-gray-700 px-3 py-1.5 text-2xl font-bold text-white"
					onkeydown={(e) => e.key === 'Enter' && handleRename()}
				/>
				<Button color="green" onclick={handleRename}>Сохранить</Button>
				<Button color="gray" onclick={() => (editingName = false)}>Отмена</Button>
			</div>
		{:else}
			<h1 class="text-2xl font-bold">{data.session.name}</h1>
			<button
				class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white"
				onclick={() => (editingName = true)}
				aria-label="Переименовать"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
					/>
				</svg>
			</button>
		{/if}
		<span
			class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm {statusStyle.bg} {statusStyle.text}"
		>
			<span class="h-2 w-2 rounded-full {statusStyle.dot}"></span>
			{statusStyle.label}
		</span>
	</div>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-4">
		<!-- Session control menu -->
		{#if data.session.status !== 'completed'}
			<div class="session-menu relative self-start">
				<button
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
					onclick={() => (menuOpen = !menuOpen)}
					aria-label="Действия с сессией"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
						/>
					</svg>
				</button>
				{#if menuOpen}
					<div
						class="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
					>
						{#if data.session.status === 'active'}
							<button
								class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-yellow-300 transition-colors hover:bg-gray-700"
								onclick={handlePause}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
								Приостановить
							</button>
							<button
								class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-300 transition-colors hover:bg-gray-700"
								onclick={handleComplete}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
								Завершить сессию
							</button>
						{:else if data.session.status === 'paused'}
							<button
								class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-300 transition-colors hover:bg-gray-700"
								onclick={handleResume}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
										clip-rule="evenodd"
									/>
								</svg>
								Возобновить
							</button>
							<button
								class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-300 transition-colors hover:bg-gray-700"
								onclick={handleComplete}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
								Завершить сессию
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<div class="session-menu relative self-start">
				<button
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
					onclick={() => (menuOpen = !menuOpen)}
					aria-label="Действия с сессией"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
						/>
					</svg>
				</button>
				{#if menuOpen}
					<div
						class="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
					>
						<button
							class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-300 transition-colors hover:bg-gray-700"
							onclick={handleRestore}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
									clip-rule="evenodd"
								/>
							</svg>
							Восстановить сессию
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Add participant -->
		<div class="rounded-xl border border-gray-700 bg-gray-800/30 p-4">
			<button
				class="flex w-full items-center justify-between text-left"
				onclick={() => (addingParticipant = !addingParticipant)}
			>
				<span class="font-semibold">Добавить участника</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-gray-400 transition-transform {addingParticipant
						? 'rotate-180'
						: ''}"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			{#if addingParticipant}
				<div class="mt-3 flex flex-col gap-3">
					<div class="flex items-center gap-3">
						<input
							type="text"
							bind:value={participantSearch}
							placeholder="Поиск по имени или ГТО-М ID..."
							class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
						/>
						<label class="flex items-center gap-1.5 text-sm whitespace-nowrap">
							<input type="checkbox" bind:checked={filterRecent} class="rounded" />
							Недавно вошедшие
						</label>
					</div>
					{#if availableUsers.length === 0}
						<p class="py-2 text-center text-sm text-gray-500">
							{participantSearch
								? 'Ничего не найдено'
								: 'Все авторизованные пользователи уже в сессии'}
						</p>
					{:else}
						<div class="max-h-60 overflow-y-auto rounded-lg border border-gray-700">
							{#each availableUsers as u (u.id)}
								<button
									class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-700"
									onclick={() => handleAddParticipant(u.id)}
								>
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-gray-300"
									>
										{u.firstname[0]}
									</span>
									<div class="flex min-w-0 flex-1 flex-col">
										<span class="truncate text-sm font-medium"
											>{u.firstname} {u.lastname}</span
										>
										<span class="text-xs text-gray-400">
											{u.sex === 'male' ? 'М' : 'Ж'} · {u.age} лет
											{#if u.gtoId}
												· ГТО-М: {u.gtoId}
											{/if}
										</span>
									</div>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5 shrink-0 text-green-500"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Participants -->
		{#if data.metrics.length === 0}
			<div class="flex flex-col items-center gap-2 py-8 text-gray-400">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-12 w-12 opacity-40"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				<p>Нет участников в этой сессии</p>
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<h2 class="text-lg font-semibold">Участники</h2>
				<span class="text-sm text-gray-400"
					>({filteredMetrics.length}/{data.metrics.length})</span
				>
				<div class="flex-1"></div>
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
						placeholder="Поиск участников..."
						bind:value={metricsSearch}
						class="rounded-lg bg-gray-700 py-2 pl-8 pr-3 text-sm"
					/>
				</div>
			</div>
			{#if filteredMetrics.length === 0}
				<p class="py-4 text-center text-sm text-gray-400">Участники не найдены</p>
			{:else}
				<div class="flex flex-col gap-3">
					{#each filteredMetrics as m, i (m.participantId)}
						{@const em = m.editableMetrics as GtoEditableMetricDetail}
						{@const isExpanded = expandedParticipant === m.participantId}
						{@const isSaving = savingMetrics.has(m.participantId)}
						<div
							class="rounded-xl border border-gray-700 bg-gray-800/50 transition-colors"
						>
							<!-- Card header — always visible -->
							<button
								class="flex w-full items-center gap-3 px-4 py-3 text-left"
								onclick={() =>
									(expandedParticipant = isExpanded ? null : m.participantId)}
							>
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300"
								>
									{i + 1}
								</span>
								<div class="flex min-w-0 flex-1 flex-col">
									<span class="truncate font-medium">
										{m.firstname}
										{m.lastname}
									</span>
									<span class="text-xs text-gray-400">
										{m.sex === 'male' ? 'М' : 'Ж'} · {m.age} лет
										{#if data.gtoIdMap.get(m.userId)}
											· ГТО-М: {data.gtoIdMap.get(m.userId)}
										{/if}
									</span>
								</div>
								<div class="flex items-center gap-2">
									{#if m.missingSurveyFields.length > 0}
										<span
											class="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300"
											title={missingFieldLabels(m.missingSurveyFields)}
										>
											{m.missingSurveyFields.length} полей
										</span>
									{:else}
										<span
											class="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-300"
										>
											Анкета ✓
										</span>
									{/if}
									{#if m.wordScore !== null}
										<span
											class="rounded-full bg-purple-900/40 px-2 py-0.5 text-xs text-purple-300"
										>
											Слова: {m.wordScore}/5
										</span>
									{:else if m.submittedWords}
										<span
											class="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300"
											title={m.submittedWords.join(', ')}
										>
											Слова: ожидает сета
										</span>
									{/if}
									<!-- Remove participant -->
									{#if removingParticipant === m.participantId}
										<div class="flex items-center gap-1">
											<button
												class="rounded px-2 py-0.5 text-xs text-red-300 transition-colors hover:bg-red-900/40"
												onclick={(e) => {
													e.stopPropagation();
													handleRemoveParticipant(m.participantId);
												}}
											>
												Удалить
											</button>
											<button
												class="rounded px-2 py-0.5 text-xs text-gray-400 transition-colors hover:bg-gray-700"
												onclick={(e) => {
													e.stopPropagation();
													removingParticipant = null;
												}}
											>
												Отмена
											</button>
										</div>
									{:else}
										<button
											class="rounded p-1 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
											onclick={(e) => {
												e.stopPropagation();
												removingParticipant = m.participantId;
											}}
											aria-label="Удалить участника"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
													clip-rule="evenodd"
												/>
											</svg>
										</button>
									{/if}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5 shrink-0 text-gray-400 transition-transform {isExpanded
											? 'rotate-180'
											: ''}"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							</button>

							<!-- Expanded content -->
							{#if isExpanded}
								<div class="border-t border-gray-700 px-4 py-4">
									<div class="flex flex-col gap-5">
										<!-- Test metrics grid -->
										<div
											class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
										>
											<!-- Stroop -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400"
												>
													Струп
												</h4>
												<div class="flex flex-col gap-1.5 text-sm">
													{#each [{ label: 'Этап 1', data: m.stroop.stage1 }, { label: 'Этап 2', data: m.stroop.stage2 }, { label: 'Этап 3', data: m.stroop.stage3 }] as stage}
														<div class="flex items-center gap-2">
															<span
																class="w-16 shrink-0 text-xs text-gray-400"
																>{stage.label}</span
															>
															<span class="tabular-nums"
																>{fmt(stage.data.meanTime)}с</span
															>
															<span class="text-xs text-gray-500"
																>σ{fmt(stage.data.stdDevTime)}</span
															>
															<span
																class="ml-auto tabular-nums {stage
																	.data.accuracy >= 0.8
																	? 'text-green-400'
																	: stage.data.accuracy >= 0.5
																		? 'text-yellow-400'
																		: 'text-red-400'}"
															>
																{pct(stage.data.accuracy)}
															</span>
														</div>
													{/each}
												</div>
											</div>

											<!-- Math -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400"
												>
													Арифметика
												</h4>
												<div class="flex flex-col gap-1 text-sm">
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Среднее</span
														>
														<span class="tabular-nums"
															>{fmt(m.math.meanTime)}с</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>σ</span
														>
														<span class="tabular-nums"
															>{fmt(m.math.stdDevTime)}</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Точность</span
														>
														<span
															class="tabular-nums {m.math.accuracy >=
															0.8
																? 'text-green-400'
																: m.math.accuracy >= 0.5
																	? 'text-yellow-400'
																	: 'text-red-400'}"
														>
															{pct(m.math.accuracy)}
														</span>
													</div>
												</div>
											</div>

											<!-- Munsterberg -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400"
												>
													Мюнстерберг
												</h4>
												<div class="flex flex-col gap-1 text-sm">
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Среднее</span
														>
														<span class="tabular-nums"
															>{fmt(m.munsterberg.meanTime)}с</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>σ</span
														>
														<span class="tabular-nums"
															>{fmt(m.munsterberg.stdDevTime)}</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Доля</span
														>
														<span class="tabular-nums"
															>{pct(
																m.munsterberg.fractionGuessed
															)}</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Кол-во</span
														>
														<span class="tabular-nums"
															>{m.munsterberg.totalWordsHidden}</span
														>
													</div>
												</div>
											</div>

											<!-- Campimetry -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400"
												>
													Кампиметрия
												</h4>
												<div class="flex flex-col gap-1.5 text-sm">
													{#each [{ label: 'Этап 1', data: m.campimetry.stage1 }, { label: 'Этап 2', data: m.campimetry.stage2 }] as stage}
														<div class="flex flex-col gap-1">
															<span class="text-xs text-gray-400"
																>{stage.label}</span
															>
															<div
																class="flex items-center gap-2 pl-2"
															>
																<span class="tabular-nums"
																	>{fmt(
																		stage.data.meanTime
																	)}с</span
																>
																<span class="text-xs text-gray-500"
																	>σ{fmt(
																		stage.data.stdDevTime
																	)}</span
																>
																<span class="text-xs text-gray-500"
																	>δ{fmt(
																		stage.data.meanDelta
																	)}</span
																>
															</div>
														</div>
													{/each}
													<div class="mt-1 border-t border-gray-700 pt-1">
														<span class="text-xs text-gray-400"
															>Разброс (эт. 2)</span
														>
														<div class="flex gap-3 pl-2 text-xs">
															<span class="text-yellow-400"
																>Недож: {m.campimetry
																	.stage2Breakdown
																	.underPress}</span
															>
															<span class="text-green-400"
																>Точно: {m.campimetry
																	.stage2Breakdown.exact}</span
															>
															<span class="text-red-400"
																>Переж: {m.campimetry
																	.stage2Breakdown
																	.overPress}</span
															>
														</div>
													</div>
												</div>
											</div>

											<!-- Memory -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400"
												>
													Память
												</h4>
												<div class="flex flex-col gap-1 text-sm">
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Среднее</span
														>
														<span class="tabular-nums"
															>{fmt(m.memory.meanTime)}с</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>σ</span
														>
														<span class="tabular-nums"
															>{fmt(m.memory.stdDevTime)}</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Точность</span
														>
														<span
															class="tabular-nums {m.memory
																.accuracy >= 0.8
																? 'text-green-400'
																: m.memory.accuracy >= 0.5
																	? 'text-yellow-400'
																	: 'text-red-400'}"
														>
															{pct(m.memory.accuracy)}
														</span>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Точность</span
														>
														<span
															class="tabular-nums {m.memory
																.accuracy >= 0.8
																? 'text-green-400'
																: m.memory.accuracy >= 0.5
																	? 'text-yellow-400'
																	: 'text-red-400'}"
														>
															{pct(m.memory.accuracy)}
														</span>
													</div>
												</div>
											</div>

											<!-- Swallow -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-400"
												>
													Ласточка
												</h4>
												<div class="flex flex-col gap-1 text-sm">
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Среднее</span
														>
														<span class="tabular-nums"
															>{fmt(m.swallow.meanTime)}с</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>σ</span
														>
														<span class="tabular-nums"
															>{fmt(m.swallow.stdDevTime)}</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-16 shrink-0 text-xs text-gray-400"
															>Точность</span
														>
														<span
															class="tabular-nums {m.swallow
																.accuracy >= 0.8
																? 'text-green-400'
																: m.swallow.accuracy >= 0.5
																	? 'text-yellow-400'
																	: 'text-red-400'}"
														>
															{pct(m.swallow.accuracy)}
														</span>
													</div>
												</div>
											</div>

											<!-- Raven -->
											<div class="rounded-lg bg-gray-900/50 p-3">
												<h4
													class="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400"
												>
													Матрицы Равена
												</h4>
												<div class="flex flex-col gap-1 text-sm">
													<div class="flex items-center gap-2">
														<span
															class="w-20 shrink-0 text-xs text-gray-400"
															>Всего</span
														>
														<span class="tabular-nums"
															>{m.raven.correctCount}/{m.raven
																.totalQuestions}</span
														>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-20 shrink-0 text-xs text-gray-400"
															>Точность</span
														>
														<span
															class="tabular-nums {m.raven.accuracy >=
															0.8
																? 'text-green-400'
																: m.raven.accuracy >= 0.5
																	? 'text-yellow-400'
																	: 'text-red-400'}"
														>
															{pct(m.raven.accuracy)}
														</span>
													</div>
													<div class="flex items-center gap-2">
														<span
															class="w-20 shrink-0 text-xs text-gray-400"
															>Среднее</span
														>
														<span class="tabular-nums"
															>{fmt(
																m.raven.averageResponseTimeMs / 1000
															)}с</span
														>
													</div>
												</div>

												<div class="mt-2 border-t border-gray-700 pt-2">
													<span class="text-xs text-gray-400"
														>По сложности</span
													>
													<div
														class="mt-1 grid grid-cols-3 gap-2 text-xs"
													>
														<div>
															<span class="text-gray-500">Легкие</span
															>
															<div class="tabular-nums">
																{m.raven.byDifficulty.level1
																	.correct}/{m.raven.byDifficulty
																	.level1.total}
															</div>
														</div>
														<div>
															<span class="text-gray-500"
																>Средние</span
															>
															<div class="tabular-nums">
																{m.raven.byDifficulty.level2
																	.correct}/{m.raven.byDifficulty
																	.level2.total}
															</div>
														</div>
														<div>
															<span class="text-gray-500"
																>Сложные</span
															>
															<div class="tabular-nums">
																{m.raven.byDifficulty.level3
																	.correct}/{m.raven.byDifficulty
																	.level3.total}
															</div>
														</div>
													</div>
												</div>

												{#if Object.keys(m.raven.byTaskClass).length > 0}
													<div class="mt-2 border-t border-gray-700 pt-2">
														<span class="text-xs text-gray-400"
															>По классу задач</span
														>
														<div
															class="mt-1 flex flex-col gap-0.5 text-xs"
														>
															{#each Object.entries(m.raven.byTaskClass) as [tc, info] (tc)}
																<div
																	class="flex items-center justify-between"
																>
																	<span class="text-gray-500"
																		>{info.label}</span
																	>
																	<span class="tabular-nums"
																		>{info.correct}/{info.total}</span
																	>
																</div>
															{/each}
														</div>
													</div>
												{/if}
											</div>
										</div>

										<!-- Editable metrics section -->
										<div
											class="rounded-lg border border-gray-700 bg-gray-900/30 p-4"
										>
											<h4
												class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
											>
												Редактируемые данные
											</h4>
											<form
												class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
												onsubmit={(e) => {
													e.preventDefault();
													const form = e.currentTarget;
													const fd = new FormData(form);
													const metrics: Record<string, string> = {};
													for (const [key, value] of fd.entries()) {
														if (
															key !== 'wordSetNumber' &&
															typeof value === 'string' &&
															value
														) {
															metrics[key] = value;
														}
													}
													handleSaveMetrics(m.participantId, metrics);
												}}
											>
												<!-- Balance test -->
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Тест на баланс</span
													>
													<select
														name="balanceTest"
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
													>
														<option value="" selected={!em.balanceTest}
															>—</option
														>
														{#each balanceTestOptions as opt (opt)}
															<option
																value={opt}
																selected={em.balanceTest === opt}
																>{opt}</option
															>
														{/each}
													</select>
												</label>

												<!-- Maze Q1/Q2/Q3 -->
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Лабиринт Q1</span
													>
													<input
														type="number"
														name="mazeQ1"
														min="0"
														max="1"
														step="0.01"
														value={em.mazeQ1 ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="0–1"
													/>
												</label>
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Лабиринт Q2</span
													>
													<input
														type="number"
														name="mazeQ2"
														min="0"
														max="1"
														step="0.01"
														value={em.mazeQ2 ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="0–1"
													/>
												</label>
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Лабиринт Q3</span
													>
													<input
														type="number"
														name="mazeQ3"
														min="0"
														max="1"
														step="0.01"
														value={em.mazeQ3 ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="0–1"
													/>
												</label>

												<!-- Maze VR -->
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Лабиринт VR №</span
													>
													<input
														type="number"
														name="mazeVRNumber"
														value={em.mazeVRNumber ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="Номер"
													/>
												</label>
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Лабиринт VR файл</span
													>
													<input
														type="text"
														name="mazeVRFileName"
														value={em.mazeVRFileName ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="Имя файла"
													/>
												</label>

												<!-- Button test -->
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Кнопочки №</span
													>
													<input
														type="number"
														name="buttonTestNumber"
														min="0"
														max="20"
														value={em.buttonTestNumber ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="0–20"
													/>
												</label>
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Кнопочки файл</span
													>
													<input
														type="text"
														name="buttonTestFileName"
														value={em.buttonTestFileName ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="Имя файла"
													/>
												</label>

												<!-- Logic -->
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400">Логика</span
													>
													<input
														type="number"
														name="logic"
														min="0"
														max="1"
														step="0.01"
														value={em.logic ?? ''}
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														placeholder="0–1"
													/>
												</label>

												<!-- Word set -->
												<label class="flex flex-col gap-1">
													<span class="text-xs text-gray-400"
														>Сет слов</span
													>
													<select
														name="wordSetNumber"
														class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
														onchange={(e) => {
															const target =
																e.currentTarget as HTMLSelectElement;
															const wordSetId = target.value;
															if (wordSetId) {
																assignWordSet(
																	m.participantId,
																	wordSetId
																);
															}
														}}
													>
														<option
															value=""
															selected={!data.wordSetIdMap.get(
																m.participantId
															)}>—</option
														>
														{#each data.wordSets as ws (ws.id)}
															<option
																value={ws.id}
																selected={data.wordSetIdMap.get(
																	m.participantId
																) === ws.id}
															>
																Сет {ws.setNumber}
															</option>
														{/each}
													</select>
												</label>

												<!-- Save button -->
												<div class="flex items-end">
													<Button
														color="green"
														type="submit"
														disabled={isSaving}
													>
														{#if isSaving}
															Сохранение...
														{:else}
															Сохранить
														{/if}
													</Button>
												</div>
											</form>
										</div>
										<div
											class="rounded-lg border border-gray-700 bg-gray-900/30 p-4"
										>
											<h2
												class="mb-3 text-xs font-semibold uppercase tracking-wider text-white"
											>
												Выбранные слова:
											</h2>
											<p class="text-white text-center">
												{m.submittedWords?.join(', ')}
											</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
				<!-- TODO: should style it better or even move it somewhere else in the UI? -->
				<div class="flex flex-col gap-2">
					<Button color="green" onclick={() => exportMetrics(data.metrics, sessionName)}
						>Экспорт результатов</Button
					>
				</div>
			{/if}
		{/if}
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="red" goto="/admin/gto">Сессии ГТО-М</Button>
</section>

{#if toastMessage}
	<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = null)} />
{/if}
