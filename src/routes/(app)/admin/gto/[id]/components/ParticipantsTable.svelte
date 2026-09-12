<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { missingFieldLabels } from '$lib/survey-field-labels';
	import type { PageProps } from '../$types';
	import type {
		GtoEditableMetricDetail,
		ParticipantMetrics
	} from '$lib/server/db/controllers/gto';
	import type { FileNumberStatus } from '$lib/client/gto-button-data';
	import type { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { MetricsDraft } from '../table-helpers';

	function fmt(val: number | null, decimals = 2): string {
		if (val === null) return '—';
		return val.toFixed(decimals);
	}

	function pct(val: number): string {
		return (val * 100).toFixed(1) + '%';
	}

	const balanceTestOptions = ['0-15', '15-30', '30-45', '45-60', '60+'] as const;

	let {
		metrics,
		totalCount,
		gtoIdMap,
		wordSets,
		sessionStatus,
		generatingCertificateId,
		fileNumbersWithStatus,
		availableFileNumbers,
		participantButtonIds,
		draftMap,
		savingMetrics,
		expandedParticipant,
		removingParticipant,
		selectedButtonFile,
		onSetDraft,
		onSelectButtonFile,
		onLoadButtonFile,
		onSaveRow,
		onAssignWordSet,
		onDownloadCertificate,
		onToggleExpand,
		onStartRemoving,
		onRemoveParticipant,
		onCancelRemoving
	}: {
		/** Отфильтрованный по поиску список участников */
		metrics: ParticipantMetrics[];
		/** Общее число участников сессии (без фильтра поиска) */
		totalCount: number;
		gtoIdMap: Map<string, string | null>;
		wordSets: PageProps['data']['wordSets'];
		sessionStatus: string;
		generatingCertificateId: string | null;
		fileNumbersWithStatus: FileNumberStatus[];
		availableFileNumbers: string[];
		participantButtonIds: SvelteMap<string, number[]>;
		draftMap: SvelteMap<string, MetricsDraft>;
		savingMetrics: SvelteSet<string>;
		expandedParticipant: string | null;
		removingParticipant: string | null;
		selectedButtonFile: SvelteMap<string, string>;
		onSetDraft: (participantId: string, field: keyof MetricsDraft, value: string) => void;
		onSelectButtonFile: (participantId: string, fileNumber: string | null) => void;
		onLoadButtonFile: (fileNumber: string) => void;
		onSaveRow: (participantId: string) => void;
		onAssignWordSet: (participantId: string, wordSetId: string) => void;
		onDownloadCertificate: (m: ParticipantMetrics) => void;
		onToggleExpand: (participantId: string) => void;
		onStartRemoving: (participantId: string) => void;
		onRemoveParticipant: (participantId: string) => void;
		onCancelRemoving: () => void;
	} = $props();
</script>

{#if totalCount === 0}
	<div class="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
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
	{#if metrics.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
			<p class="text-sm">Участники не найдены</p>
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-700 bg-white">
			<table class="w-full min-w-300 border-separate border-spacing-0 text-sm">
				<thead class="sticky top-0 bg-gray-50">
					<tr>
						<th
							class="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>#</th
						>
						<th
							class="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>ГТО-ID</th
						>
						<th
							class="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>ФИО / возраст</th
						>
						<th
							class="w-28 px-3 py-2 text-center text-xs font-semibold whitespace-nowrap text-gray-600"
							>Анкета</th
						>
						<th
							class="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap text-gray-600"
							>Слова</th
						>
						<th
							class="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap text-gray-600"
							>Счёт</th
						>
						<th
							class="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Баланс</th
						>
						<th
							class="w-20 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Лаб Q1</th
						>
						<th
							class="w-20 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Лаб Q2</th
						>
						<th
							class="w-20 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Лаб Q3</th
						>
						<th
							class="w-28 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Лаб VR №</th
						>
						<th
							class="w-28 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Лаб VR файл</th
						>
						<th
							class="w-32 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Кноп. файл</th
						>
						<th
							class="w-20 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Кноп. №</th
						>
						<th
							class="w-16 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Логика</th
						>
						<th
							class="w-28 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-600"
							>Сет слов</th
						>
						<th
							class="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap text-gray-600"
							>Действия</th
						>
					</tr>
				</thead>
				<tbody>
					{#each metrics as m, i (m.participantId)}
						{@const em = m.editableMetrics as GtoEditableMetricDetail}
						{@const isExpanded = expandedParticipant === m.participantId}
						{@const isSaving = savingMetrics.has(m.participantId)}
						{@const draft = draftMap.get(m.participantId)}
						{@const effectiveButtonFile =
							selectedButtonFile.get(m.participantId) ?? em.buttonTestFileName}
						<tr class="border-b border-gray-100">
							<td class="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
							<td class="px-3 py-2 font-mono text-xs text-gray-600">
								{gtoIdMap.get(m.userId) ?? '—'}
							</td>
							<td class="px-3 py-2">
								<div class="flex flex-col">
									<span class="truncate font-medium">
										{m.firstname}
										{m.lastname}
									</span>
									<span class="text-xs text-gray-400">
										{m.sex === 'male' ? 'М' : 'Ж'} · {m.age} лет
									</span>
								</div>
							</td>
							<td class="px-3 py-2 text-center">
								{#if m.missingSurveyFields.length > 0}
									<span
										class="rounded-full bg-red-300 px-2 py-0.5 text-xs whitespace-nowrap text-white"
										title={missingFieldLabels(m.missingSurveyFields)}
										>{m.missingSurveyFields.length} полей</span
									>
								{:else}
									<span class="text-xs text-green-600">✓</span>
								{/if}
							</td>
							<td class="px-3 py-2 text-center">
								{#if m.wordScore !== null}
									<span class="text-xs text-purple-600">{m.wordScore}/5</span>
								{:else if m.submittedWords}
									<span
										class="text-xs text-yellow-600"
										title={m.submittedWords.join(', ')}>ожидает сета</span
									>
								{:else}
									<span class="text-xs text-gray-300">—</span>
								{/if}
							</td>
							<td class="px-3 py-2 text-center text-xs tabular-nums">
								{m.wordScore ?? '—'}
							</td>
							<td class="px-1 py-2">
								<select
									class="w-24 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.balanceTest ?? ''}
									disabled={!draft}
									onchange={(e) =>
										onSetDraft(
											m.participantId,
											'balanceTest',
											(e.currentTarget as HTMLSelectElement).value
										)}
								>
									<option value="">—</option>
									{#each balanceTestOptions as opt (opt)}
										<option value={opt}>{opt}</option>
									{/each}
								</select>
							</td>
							<td class="px-1 py-2">
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									class="w-14 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.mazeQ1 ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'mazeQ1',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
							</td>
							<td class="px-1 py-2">
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									class="w-14 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.mazeQ2 ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'mazeQ2',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
							</td>
							<td class="px-1 py-2">
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									class="w-14 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.mazeQ3 ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'mazeQ3',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
							</td>
							<td class="px-1 py-2">
								<input
									type="number"
									class="w-20 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.mazeVRNumber ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'mazeVRNumber',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
							</td>
							<td class="px-1 py-2">
								<input
									type="text"
									class="w-24 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.mazeVRFileName ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'mazeVRFileName',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
							</td>
							<td class="px-1 py-2">
								<input
									type="text"
									list="button-file-opts-{m.participantId}"
									class="w-28 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.buttonTestFileName ?? ''}
									disabled={!draft}
									oninput={(e) => {
										const val = (
											e.currentTarget as HTMLInputElement
										).value.trim();
										onSelectButtonFile(m.participantId, val || null);
										if (
											val &&
											(availableFileNumbers.includes(val) ||
												fileNumbersWithStatus.some(
													(f) => f.fileNumber === val
												))
										) {
											onLoadButtonFile(val);
										}
										onSetDraft(m.participantId, 'buttonTestFileName', val);
									}}
								/>
								<datalist id="button-file-opts-{m.participantId}">
									{#each availableFileNumbers as fn (fn)}
										<option value={fn}></option>
									{/each}
								</datalist>
							</td>
							<td class="px-1 py-2">
								<input
									type="number"
									min="1"
									max="20"
									list="button-num-opts-{m.participantId}"
									class="w-14 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.buttonTestNumber ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'buttonTestNumber',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
								<datalist id="button-num-opts-{m.participantId}">
									{#if effectiveButtonFile && participantButtonIds.has(effectiveButtonFile)}
										{#each participantButtonIds.get(effectiveButtonFile) ?? [] as btnId (btnId)}
											<option value={btnId}></option>
										{/each}
									{/if}
								</datalist>
							</td>
							<td class="px-1 py-2">
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									class="w-14 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.logic ?? ''}
									disabled={!draft}
									oninput={(e) =>
										onSetDraft(
											m.participantId,
											'logic',
											(e.currentTarget as HTMLInputElement).value
										)}
								/>
							</td>
							<td class="px-1 py-2">
								<select
									class="w-28 rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none"
									value={draft?.wordSetId ?? ''}
									disabled={!draft}
									onchange={(e) => {
										const val = (e.currentTarget as HTMLSelectElement).value;
										onSetDraft(m.participantId, 'wordSetId', val);
										if (val) onAssignWordSet(m.participantId, val);
									}}
								>
									<option value="">—</option>
									{#each wordSets as ws (ws.id)}
										<option value={ws.id}>Сет {ws.setNumber}</option>
									{/each}
								</select>
							</td>
							<td class="px-2 py-2">
								<div class="flex items-center gap-2">
									<Button
										color="green"
										disabled={isSaving || !draft}
										onclick={() => onSaveRow(m.participantId)}
									>
										{#if isSaving}Сохр…{:else}Сохр.{/if}
									</Button>
									{#if sessionStatus === 'completed'}
										{@const isGeneratingCertificate =
											generatingCertificateId === m.participantId}
										<button
											class="rounded px-2 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
											disabled={isGeneratingCertificate}
											title="Скачать PDF-сертификат участника"
											onclick={() => onDownloadCertificate(m)}
										>
											{#if isGeneratingCertificate}Ген…{:else}Сертификат{/if}
										</button>
									{/if}
									<button
										class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
										onclick={() => onToggleExpand(m.participantId)}
										aria-label="Подробнее"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 shrink-0 transition-transform {isExpanded
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
									{#if removingParticipant === m.participantId}
										<button
											class="rounded px-2 py-0.5 text-xs text-red-600 transition-colors hover:bg-red-50"
											onclick={() => onRemoveParticipant(m.participantId)}
										>
											Удалить
										</button>
										<button
											class="rounded px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
											onclick={onCancelRemoving}
										>
											Отмена
										</button>
									{:else}
										<button
											class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
											onclick={() => onStartRemoving(m.participantId)}
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
								</div>
							</td>
						</tr>
						{#if isExpanded}
							<tr>
								<td colspan="17" class="border-b border-gray-100 px-4 py-4">
									<div
										class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
									>
										<!-- Stroop -->
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-blue-400 uppercase"
											>
												Струп
											</h4>
											<div class="flex flex-col gap-1.5 text-sm">
												{#each [{ label: 'Этап 1', data: m.stroop.stage1 }, { label: 'Этап 2', data: m.stroop.stage2 }, { label: 'Этап 3', data: m.stroop.stage3 }] as stage (stage.label)}
													<div class="flex items-center gap-2">
														<span class="w-16 shrink-0 text-xs"
															>{stage.label}</span
														>
														<span class="tabular-nums"
															>{fmt(stage.data.meanTime)}с</span
														>
														<span class="text-xs"
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
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-emerald-400 uppercase"
											>
												Арифметика
											</h4>
											<div class="flex flex-col gap-1 text-sm">
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Среднее</span
													><span class="tabular-nums"
														>{fmt(m.math.meanTime)}с</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs">σ</span
													><span class="tabular-nums"
														>{fmt(m.math.stdDevTime)}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Точность</span
													><span
														class="tabular-nums {m.math.accuracy >= 0.8
															? 'text-green-400'
															: m.math.accuracy >= 0.5
																? 'text-yellow-400'
																: 'text-red-400'}"
														>{pct(m.math.accuracy)}</span
													>
												</div>
											</div>
										</div>

										<!-- Munsterberg -->
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-amber-400 uppercase"
											>
												Мюнстерберг
											</h4>
											<div class="flex flex-col gap-1 text-sm">
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Среднее</span
													><span class="tabular-nums"
														>{fmt(m.munsterberg.meanTime)}с</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs">σ</span
													><span class="tabular-nums"
														>{fmt(m.munsterberg.stdDevTime)}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs">Доля</span
													><span class="tabular-nums"
														>{pct(m.munsterberg.fractionGuessed)}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs">Кол-во</span
													><span class="tabular-nums"
														>{m.munsterberg.totalWordsHidden}</span
													>
												</div>
											</div>
										</div>

										<!-- Campimetry -->
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-rose-400 uppercase"
											>
												Кампиметрия
											</h4>
											<div class="flex flex-col gap-1.5 text-sm">
												{#each [{ label: 'Этап 1', data: m.campimetry.stage1 }, { label: 'Этап 2', data: m.campimetry.stage2 }] as stage (stage.label)}
													<div class="flex flex-col gap-1">
														<span class="text-xs">{stage.label}</span>
														<div class="flex items-center gap-2 pl-2">
															<span class="tabular-nums"
																>{fmt(stage.data.meanTime)}с</span
															>
															<span class="text-xs"
																>σ{fmt(stage.data.stdDevTime)}</span
															>
															<span class="text-xs"
																>δ{fmt(stage.data.meanDelta)}</span
															>
														</div>
													</div>
												{/each}
												<div class="mt-1 border-t bg-[#E5E7EB] pt-1">
													<span class="text-xs">Разброс (эт. 2)</span>
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
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-cyan-400 uppercase"
											>
												Память
											</h4>
											<div class="flex flex-col gap-1 text-sm">
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Среднее</span
													><span class="tabular-nums"
														>{fmt(m.memory.meanTime)}с</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs">σ</span
													><span class="tabular-nums"
														>{fmt(m.memory.stdDevTime)}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Точность</span
													><span
														class="tabular-nums {m.memory.accuracy >=
														0.8
															? 'text-green-400'
															: m.memory.accuracy >= 0.5
																? 'text-yellow-400'
																: 'text-red-400'}"
														>{pct(m.memory.accuracy)}</span
													>
												</div>
											</div>
										</div>

										<!-- Swallow -->
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-teal-400 uppercase"
											>
												Ласточка
											</h4>
											<div class="flex flex-col gap-1 text-sm">
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Среднее</span
													><span class="tabular-nums"
														>{fmt(m.swallow.meanTime)}с</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs">σ</span
													><span class="tabular-nums"
														>{fmt(m.swallow.stdDevTime)}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-16 shrink-0 text-xs"
														>Точность</span
													><span
														class="tabular-nums {m.swallow.accuracy >=
														0.8
															? 'text-green-400'
															: m.swallow.accuracy >= 0.5
																? 'text-yellow-400'
																: 'text-red-400'}"
														>{pct(m.swallow.accuracy)}</span
													>
												</div>
											</div>
										</div>

										<!-- Raven -->
										<div class="rounded-lg bg-[#E5E7EB] p-3">
											<h4
												class="mb-2 text-center text-xs font-semibold tracking-wider text-violet-400 uppercase"
											>
												Матрицы Равена
											</h4>
											<div class="flex flex-col gap-1 text-sm">
												<div class="flex items-center gap-2">
													<span class="w-20 shrink-0 text-xs">Всего</span
													><span class="tabular-nums"
														>{m.raven.correctCount}/{m.raven
															.totalQuestions}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-20 shrink-0 text-xs"
														>Точность</span
													><span
														class="tabular-nums {m.raven.accuracy >= 0.8
															? 'text-green-400'
															: m.raven.accuracy >= 0.5
																? 'text-yellow-400'
																: 'text-red-400'}"
														>{pct(m.raven.accuracy)}</span
													>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-20 shrink-0 text-xs"
														>Среднее</span
													><span class="tabular-nums"
														>{fmt(
															m.raven.averageResponseTimeMs / 1000
														)}с</span
													>
												</div>
											</div>
											<div class="mt-2 border-t border-gray-700 pt-2">
												<span class="text-xs">По сложности</span>
												<div class="mt-1 grid grid-cols-3 gap-2 text-xs">
													<div>
														<span>Легкие</span>
														<div class="tabular-nums">
															{m.raven.byDifficulty.level1.correct}/{m
																.raven.byDifficulty.level1.total}
														</div>
													</div>
													<div>
														<span>Средние</span>
														<div class="tabular-nums">
															{m.raven.byDifficulty.level2.correct}/{m
																.raven.byDifficulty.level2.total}
														</div>
													</div>
													<div>
														<span>Сложные</span>
														<div class="tabular-nums">
															{m.raven.byDifficulty.level3.correct}/{m
																.raven.byDifficulty.level3.total}
														</div>
													</div>
												</div>
											</div>
											{#if Object.keys(m.raven.byTaskClass).length > 0}
												<div class="mt-2 border-t border-gray-700 pt-2">
													<span class="text-xs">По классу задач</span>
													<div class="mt-1 flex flex-col gap-0.5 text-xs">
														{#each Object.entries(m.raven.byTaskClass) as [tc, info] (tc)}
															<div
																class="flex items-center justify-between"
															>
																<span>{info.label}</span><span
																	class="tabular-nums"
																	>{info.correct}/{info.total}</span
																>
															</div>
														{/each}
													</div>
												</div>
											{/if}
										</div>
									</div>

									{#if m.submittedWords && m.submittedWords.length > 0}
										<div
											class="mt-2 rounded-lg border border-gray-700 bg-white p-3"
										>
											<h4
												class="mb-1 text-center text-xs font-semibold tracking-wider uppercase"
											>
												Выбранные слова
											</h4>
											<p class="text-center text-sm">
												{m.submittedWords.join(', ')}
											</p>
										</div>
									{/if}
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}
