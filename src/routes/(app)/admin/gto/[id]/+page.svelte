<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { missingFieldLabels } from '$lib/survey-field-labels';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';
	import type { GtoEditableMetricDetail } from '$lib/server/db/controllers/gto';

	let { data }: PageProps = $props();
	let editingName = $state(false);
	let sessionName = $state(data.session.name);
	let savingMetrics = $state<Set<string>>(new Set());
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'error' | 'success' | 'info'>('info');
	let expandedParticipant = $state<string | null>(null);

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
</script>

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
	<p class="text-sm opacity-60">{formatDate(data.session.createdAt)}</p>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-4">
		<!-- Words -->
		{#if data.session.words.length > 0}
			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Слова</h3>
				<div class="flex flex-wrap gap-2">
					{#each data.session.words as w (w.position)}
						<span
							class="inline-flex items-center gap-1 rounded-lg bg-indigo-900/40 px-3 py-1.5 text-sm font-medium text-indigo-200"
						>
							<span class="text-xs text-indigo-400">{w.position + 1}.</span>
							{w.word}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Session control buttons -->
		{#if data.session.status === 'active'}
			<div class="flex gap-2">
				<Button color="yellow" onclick={handlePause}>Приостановить</Button>
				<Button color="red" onclick={handleComplete}>Завершить сессию</Button>
			</div>
		{:else if data.session.status === 'paused'}
			<div class="flex gap-2">
				<Button color="green" onclick={handleResume}>Возобновить</Button>
				<Button color="red" onclick={handleComplete}>Завершить сессию</Button>
			</div>
		{/if}

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
			<div class="flex flex-col gap-3">
				{#each data.metrics as m, i (m.participantId)}
					{@const em = m.editableMetrics as GtoEditableMetricDetail}
					{@const isExpanded = expandedParticipant === m.participantId}
					{@const isSaving = savingMetrics.has(m.participantId)}
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 transition-colors">
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
									{m.lastname}
									{m.firstname}
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
															class="ml-auto tabular-nums {stage.data
																.accuracy >= 0.8
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
														class="tabular-nums {m.math.accuracy >= 0.8
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
														>{pct(m.munsterberg.fractionGuessed)}</span
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
														<div class="flex items-center gap-2 pl-2">
															<span class="tabular-nums"
																>{fmt(stage.data.meanTime)}с</span
															>
															<span class="text-xs text-gray-500"
																>σ{fmt(stage.data.stdDevTime)}</span
															>
															<span class="text-xs text-gray-500"
																>δ{fmt(stage.data.meanDelta)}</span
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
															>Недож: {m.campimetry.stage2Breakdown
																.underPress}</span
														>
														<span class="text-green-400"
															>Точно: {m.campimetry.stage2Breakdown
																.exact}</span
														>
														<span class="text-red-400"
															>Переж: {m.campimetry.stage2Breakdown
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
														class="tabular-nums {m.memory.accuracy >=
														0.8
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
														class="tabular-nums {m.swallow.accuracy >=
														0.8
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
												<span class="text-xs text-gray-400">Кнопочки №</span
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
												<span class="text-xs text-gray-400">Логика</span>
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
												<span class="text-xs text-gray-400">Сет слов</span>
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
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="gray" goto="/admin/gto">← Сессии ГТО-М</Button>
</section>

{#if toastMessage}
	<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = null)} />
{/if}
