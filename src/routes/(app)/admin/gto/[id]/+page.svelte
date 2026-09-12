<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PathnameWithSearchOrHash, ResolvedPathname } from '$app/types';
	import * as XLSX from 'xlsx';
	import type { PageProps } from './$types';
	import type { ParticipantMetrics } from '$lib/server/db/controllers/gto';
	import {
		uploadButtonFiles,
		getParticipantIdsForFile,
		getResultForParticipant,
		clearAllButtonData,
		loadAllButtonData,
		getFileNumbersWithStatus,
		hasOldFormatData,
		type StoredButtonPair,
		type FileNumberStatus
	} from '$lib/client/gto-button-data';
	import { initMetricsDraft, collectMetricsFromDraft, rebuildDraftMap } from './table-helpers';
	import AddParticipantCard from './components/AddParticipantCard.svelte';
	import ButtonTestFilesCard from './components/ButtonTestFilesCard.svelte';
	import ParticipantsTable from './components/ParticipantsTable.svelte';
	import { buildCertificateData } from '$lib/certificate/certificate-data';
	import { downloadCertificatePdf } from '$lib/certificate/generate';
	import { onMount, untrack } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { getContext } from 'svelte';

	const headerContext = getContext<{ value: string }>('headerText');

	// resolve() has a variadic conditional signature (ResolveArgs<T>) that
	// cannot accept the full route union — narrow it to the pathname overload.
	const resolvePathname = resolve as (path: PathnameWithSearchOrHash) => ResolvedPathname;

	let { data }: PageProps = $props();

	// Реактивно держим заголовок страницы равным имени сессии,
	// чтобы он обновлялся после rename + invalidateAll.
	$effect(() => {
		if (headerContext) {
			headerContext.value = data.session.name;
		}
	});

	let editingName = $state(false);

	let sessionName = $derived(data.session.name);
	// если после сохранения имени сервер вернёт обновлённый data — поле корректно обновится; ручные правки пользователя не перетрутся, пока data.session.name не изменится реально)

	let savingMetrics = new SvelteSet<string>();
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'error' | 'success' | 'info'>('info');
	let expandedParticipant = $state<string | null>(null);
	let topCardsOpen = $state(false);
	let metricsSearch = $state('');
	let menuOpen = $state(false);
	let removingParticipant = $state<string | null>(null);
	let fileNumbersWithStatus = $state<FileNumberStatus[]>([]);
	let availableFileNumbers = $derived(
		fileNumbersWithStatus.filter((f) => f.hasLeft && f.hasRight).map((f) => f.fileNumber)
	);
	let buttonDataLoaded = new SvelteMap<string, StoredButtonPair>();
	let uploadingFiles = $state(false);
	let participantButtonIds = new SvelteMap<string, number[]>();
	let selectedButtonFile = new SvelteMap<string, string>();
	let generatingCertificateId = $state<string | null>(null);

	function closeMenuOutside(e: MouseEvent) {
		if (menuOpen && !(e.target as HTMLElement).closest('.session-menu')) {
			menuOpen = false;
		}
	}

	function showToast(message: string, type: 'error' | 'success' | 'info' = 'error') {
		toastMessage = message;
		toastType = type;
	}

	async function loadButtonIdsForFile(fileNumber: string) {
		if (!fileNumber || !availableFileNumbers.includes(fileNumber)) return;
		const ids = await getParticipantIdsForFile(fileNumber);
		participantButtonIds.set(fileNumber, ids);
	}

	async function handleUploadFiles(files: FileList | File[]): Promise<void> {
		uploadingFiles = true;
		try {
			fileNumbersWithStatus = await uploadButtonFiles(files as FileList);
			buttonDataLoaded = new SvelteMap(await loadAllButtonData());
			for (const fn of availableFileNumbers) {
				await loadButtonIdsForFile(fn);
			}
			showToast(`Загружено файлов: ${files.length}`, 'success');
		} catch {
			showToast('Ошибка загрузки файлов');
		} finally {
			uploadingFiles = false;
		}
	}

	async function handleClearFiles(): Promise<void> {
		await clearAllButtonData();
		fileNumbersWithStatus = [];
		buttonDataLoaded.clear();
		participantButtonIds.clear();
		showToast('Файлы очищены', 'info');
	}

	onMount(async () => {
		fileNumbersWithStatus = await getFileNumbersWithStatus();
		buttonDataLoaded = new SvelteMap(await loadAllButtonData());
		// Pre-load button IDs for all existing file selections
		for (const fn of availableFileNumbers) {
			await loadButtonIdsForFile(fn);
		}
		// Check for old format data
		if (await hasOldFormatData()) {
			showToast(
				'Некоторые файлы кнопочного теста в старом формате — перезагрузите их',
				'info'
			);
		}
	});

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

	async function handleDelete() {
		if (!window.confirm('Удалить завершённую сессию? Действие необратимо.')) return;
		const response = await fetch('', { method: 'DELETE' });
		if (!response.ok) {
			let message = 'Ошибка удаления сессии';
			try {
				const data = await response.json();
				if (data?.error) message = data.error;
			} catch {
				// keep the fallback message
			}
			showToast(message);
			return;
		}
		menuOpen = false;
		// The page no longer exists — navigate instead of invalidating.
		await goto(resolvePathname('/admin/gto'));
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
		savingMetrics.add(participantId);
		try {
			const response = await fetch('', { method: 'PATCH', body: fd });
			if (!response.ok) {
				showToast('Ошибка сохранения метрик');
			} else {
				showToast('Метрики сохранены', 'success');
				await refreshData();
				selectedButtonFile.delete(participantId);
			}
		} catch {
			showToast('Ошибка сохранения метрик');
		} finally {
			savingMetrics.delete(participantId);
		}
	}

	async function exportMetrics(metrics: ParticipantMetrics[], outputName: string) {
		try {
			const HEADERS = [
				[
					'ГТО-М ID',
					'Имя',
					'Возраст',
					'Средняя скорость Струпа Часть 2',
					'Корректность Струпа Часть 2',
					'Средняя скорость моторной реакции правая рука',
					'Корректность моторной реакции правая рука',
					'Средняя скорость моторной реакции левая рука',
					'Корректность моторной реакции левая рука',
					'Средняя скорость теста на память',
					'Корректность теста на память',
					'Средняя скорость теста «Ласточка»',
					'Время прохождения теста «Ласточка»',
					'Количество верных слов',
					'Метрика «Равновесие»',
					'Метрика «Лабиринт»',
					'Метрика Мюнстерберга',
					'Средняя скорость Струпа Часть 3',
					'Корректность Струпа Часть 3',
					'Средняя скорость теста «Матрица Равена»',
					'Корректность «Матриц Равена»',
					'Метрика «Логика»'
				]
			];

			const rows = [];
			for (const m of metrics) {
				let avgReactionRight: number | string | null = null;
				let accuracyRight: number | string | null = null;
				let avgReactionLeft: number | string | null = null;
				let accuracyLeft: number | string | null = null;

				const buttonTestFileName = m.editableMetrics.buttonTestFileName;
				const buttonTestNumber = m.editableMetrics.buttonTestNumber;
				if (buttonTestFileName && buttonTestNumber != null) {
					const result = await getResultForParticipant(
						buttonTestFileName,
						buttonTestNumber
					);
					avgReactionLeft = result.left?.avgReaction ?? 'файл не загружен';
					accuracyLeft = result.left?.accuracy ?? 'файл не загружен';
					avgReactionRight = result.right?.avgReaction ?? 'файл не загружен';
					accuracyRight = result.right?.accuracy ?? 'файл не загружен';
				}

				rows.push({
					ID: data.gtoIdMap.get(m.userId) ?? '',
					Name: m.firstname,
					Age: m.age,
					StroopStage2MeanTime: m.stroop.stage2.meanTime,
					StroopStage2Accuracy: m.stroop.stage2.accuracy,
					AvgReactionRight: avgReactionRight,
					AccuracyRight: accuracyRight,
					AvgReactionLeft: avgReactionLeft,
					AccuracyLeft: accuracyLeft,
					MemoryMeanTime: m.memory.meanTime,
					MemoryAccuracy: m.memory.accuracy,
					SwallowMeanTime: m.swallow.meanTime,
					SwallowTotalTime: m.swallow.totalTime,
					WordScore: m.wordScore,
					BalanceTest: m.editableMetrics.balanceTest,
					Maze:
						(m.editableMetrics.mazeQ1 ?? 0) +
						(m.editableMetrics.mazeQ2 ?? 0) +
						(m.editableMetrics.mazeQ3 ?? 0),
					Munsterberg: m.munsterberg.fractionGuessed,
					StroopStage3MeanTime: m.stroop.stage3.meanTime,
					StroopStage3Accuracy: m.stroop.stage3.accuracy,
					RavenMeanTime: m.raven.averageResponseTimeMs,
					RavenAccuracy: m.raven.accuracy,
					Logic: m.editableMetrics.logic
				});
			}

			const worksheet = XLSX.utils.json_to_sheet(rows);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.sheet_add_aoa(worksheet, HEADERS, { origin: 'A1' });
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Результаты ГТО-М');
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

	let draftMap = $state.raw(new SvelteMap<string, ReturnType<typeof initMetricsDraft>>());
	let savedParticipantId: string | null = null;

	// Rebuild draftMap from server data, preserving unsaved drafts of other rows.
	// We read draftMap via untrack to break the reactivity loop that would occur
	// if the effect depended on draftMap itself.
	$effect(() => {
		const prev = untrack(() => draftMap);
		const next = rebuildDraftMap(data.metrics, data.wordSetIdMap, prev, savedParticipantId);
		savedParticipantId = null; // consume flag BEFORE assigning draftMap
		draftMap = next;
	});

	function handleSelectButtonFile(participantId: string, fileNumber: string | null) {
		if (fileNumber) {
			selectedButtonFile.set(participantId, fileNumber);
		} else {
			selectedButtonFile.delete(participantId);
		}
	}

	function handleToggleExpand(participantId: string) {
		expandedParticipant = expandedParticipant === participantId ? null : participantId;
	}

	function setDraft(
		participantId: string,
		field: keyof ReturnType<typeof initMetricsDraft>,
		value: string
	) {
		const current = draftMap.get(participantId);
		if (!current) return;
		draftMap.set(participantId, { ...current, [field]: value });
	}

	async function handleRowSave(participantId: string) {
		const draft = draftMap.get(participantId);
		if (!draft) return;
		const payload = collectMetricsFromDraft(draft);
		savedParticipantId = participantId;
		await handleSaveMetrics(participantId, payload);
	}

	async function handleDownloadCertificate(m: ParticipantMetrics) {
		generatingCertificateId = m.participantId;
		try {
			const certificateData = buildCertificateData({
				participant: { firstname: m.firstname, lastname: m.lastname },
				session: { name: data.session.name, createdAt: data.session.createdAt },
				wordScore: m.wordScore,
				submittedWords: m.submittedWords,
				metrics: m
			});
			await downloadCertificatePdf(certificateData);
		} catch {
			showToast('Ошибка генерации сертификата');
		} finally {
			generatingCertificateId = null;
		}
	}
</script>

<svelte:window onclick={closeMenuOutside} />

<main class="main p-4!">
	<div class="flex h-full min-h-0 flex-col gap-4">
		<!-- Toolbar: статус, переименование, экспорт, меню сессии -->
		<div class="flex flex-wrap items-center gap-3">
			<span
				class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm {statusStyle.bg} {statusStyle.text}"
			>
				<span class="h-2 w-2 rounded-full {statusStyle.dot}"></span>
				{statusStyle.label}
			</span>
			{#if editingName}
				<div class="flex items-center gap-2">
					<input
						type="text"
						bind:value={sessionName}
						class="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white"
						onkeydown={(e) => e.key === 'Enter' && handleRename()}
					/>
					<Button color="green" onclick={handleRename}>Сохранить</Button>
					<Button color="gray" onclick={() => (editingName = false)}>Отмена</Button>
				</div>
			{:else}
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
			<div class="flex-1"></div>
			<Button color="green" onclick={() => exportMetrics(data.metrics, sessionName)}>
				Экспорт результатов
			</Button>
			<!-- Session control menu -->
			{#if data.session.status !== 'completed'}
				<div class="session-menu relative">
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
							class="absolute top-full right-0 z-10 mt-1 min-w-50 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
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
				<div class="session-menu relative">
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
							class="absolute top-full right-0 z-10 mt-1 min-w-50 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
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
							<button
								class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-300 transition-colors hover:bg-gray-700"
								onclick={handleDelete}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
										clip-rule="evenodd"
									/>
								</svg>
								Удалить сессию
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Общий тоггл: участники + файлы кнопочных тестов -->
		<button
			class="flex w-full items-center justify-between rounded-xl border border-gray-700 bg-white p-4 font-semibold"
			onclick={() => (topCardsOpen = !topCardsOpen)}
			aria-label="Карточки управления сессией"
			aria-expanded={topCardsOpen}
		>
			<span>Управление: участники и файлы кнопочных тестов</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 shrink-0 transition-transform {topCardsOpen ? 'rotate-180' : ''}"
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

		{#if topCardsOpen}
			<!-- Добавить участника + файлы кнопочных тестов -->
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<AddParticipantCard
					authorizedUsers={data.authorizedUsers}
					participantIds={new Set(data.session.participants.map((p) => p.userId))}
					onAdd={handleAddParticipant}
				/>
				<ButtonTestFilesCard
					{fileNumbersWithStatus}
					{uploadingFiles}
					onupload={handleUploadFiles}
					onclear={handleClearFiles}
				/>
			</div>
		{/if}

		<!-- Participants -->
		<section class="flex min-h-0 flex-1 flex-col gap-2">
			{#if data.metrics.length > 0}
				<div class="flex items-center gap-3">
					<h2 class="text-center text-lg font-semibold">Участники</h2>
					<span class="text-sm text-gray-400"
						>({filteredMetrics.length}/{data.metrics.length})</span
					>
					<div class="flex-1"></div>
					<div class="relative">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="absolute top-2.5 left-2.5 h-4 w-4 text-gray-400"
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
							class="rounded-lg bg-[#E5E7EB] py-2 pr-3 pl-8 text-sm"
						/>
					</div>
				</div>
			{/if}
			<ParticipantsTable
				metrics={filteredMetrics}
				totalCount={data.metrics.length}
				gtoIdMap={data.gtoIdMap}
				wordSets={data.wordSets}
				sessionStatus={data.session.status}
				{generatingCertificateId}
				{fileNumbersWithStatus}
				{availableFileNumbers}
				{participantButtonIds}
				{draftMap}
				{savingMetrics}
				{expandedParticipant}
				{removingParticipant}
				{selectedButtonFile}
				onSetDraft={setDraft}
				onSelectButtonFile={handleSelectButtonFile}
				onLoadButtonFile={loadButtonIdsForFile}
				onSaveRow={handleRowSave}
				onAssignWordSet={assignWordSet}
				onDownloadCertificate={handleDownloadCertificate}
				onToggleExpand={handleToggleExpand}
				onStartRemoving={(participantId) => (removingParticipant = participantId)}
				onRemoveParticipant={handleRemoveParticipant}
				onCancelRemoving={() => (removingParticipant = null)}
			/>
		</section>
	</div>
</main>

<section class="low-content flex items-center justify-center p-4!">
	<Button color="red" goto="/admin/gto">Сессии ГТО-М</Button>
</section>

{#if toastMessage}
	<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = null)} />
{/if}
