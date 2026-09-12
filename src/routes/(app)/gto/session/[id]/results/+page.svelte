<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { buildCertificateData, type CertificateInput } from '$lib/certificate/certificate-data';
	import { downloadCertificatePdf } from '$lib/certificate/generate';
	import type { PageProps } from './$types';
	import { getContext, onMount } from 'svelte';

	let { data }: PageProps = $props();

	let isGenerating = $state(true);
	let certificateError = $state<string | null>(null);

	function fmt(val: number | null, decimals = 2): string {
		if (val === null) return '—';
		return val.toFixed(decimals);
	}

	function pct(val: number): string {
		return (val * 100).toFixed(1) + '%';
	}

	const m = $derived(data.metrics);

	async function downloadCertificate(): Promise<void> {
		isGenerating = true;
		certificateError = null;
		try {
			const input: CertificateInput = {
				participant: { firstname: m.firstname, lastname: m.lastname },
				session: { name: data.session.name, createdAt: data.session.createdAt },
				wordScore: m.wordScore,
				submittedWords: m.submittedWords,
				metrics: m
			};
			await downloadCertificatePdf(buildCertificateData(input));
		} catch {
			certificateError = 'Не удалось сформировать сертификат. Попробуйте ещё раз.';
		} finally {
			isGenerating = false;
		}
	}

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) {
			headerContext.value = data.session.name;
		}
	});
</script>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-5">
		<!-- Certificate -->
		{#if data.session.status === 'completed'}
			<div class="flex flex-col items-center gap-2">
				<Button color="purple" onclick={downloadCertificate} disabled={isGenerating}>
					{isGenerating ? 'Готовим PDF…' : 'Скачать сертификат'}
				</Button>
				{#if certificateError}
					<p class="text-sm text-[color:var(--error-color)]" role="alert">
						{certificateError}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Word score -->
		{#if m.wordScore !== null}
			<div class="rounded-xl border border-violet-300/60 bg-[#d4b8e8]/40 p-4">
				<h3 class="mb-2 text-center text-sm font-semibold text-violet-800">
					Последовательность слов
				</h3>
				<div class="flex items-center gap-3">
					<span class="text-3xl font-bold text-violet-800">{m.wordScore}</span>
					<span class="text-sm text-violet-900">из 5 слов</span>
				</div>
				{#if m.submittedWords}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each m.submittedWords as word, i (i)}
							<span
								class="rounded-md bg-violet-200/70 px-2 py-0.5 text-sm text-violet-900"
								>{i + 1}. {word}</span
							>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Test metrics grid -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			<!-- Stroop -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-blue-700 uppercase"
				>
					Струп
				</h4>
				<div class="flex flex-col gap-1.5 text-sm">
					{#each [{ label: 'Этап 1', data: m.stroop.stage1 }, { label: 'Этап 2', data: m.stroop.stage2 }, { label: 'Этап 3', data: m.stroop.stage3 }] as stage (stage.label)}
						<div class="flex items-center gap-2">
							<span class="w-16 shrink-0 text-xs text-gray-500">{stage.label}</span>
							<span class="tabular-nums">{fmt(stage.data.meanTime)}с</span>
							<span class="text-xs text-gray-500">σ{fmt(stage.data.stdDevTime)}</span>
							<span
								class="ml-auto tabular-nums {stage.data.accuracy >= 0.8
									? 'text-green-700'
									: stage.data.accuracy >= 0.5
										? 'text-amber-700'
										: 'text-red-700'}"
							>
								{pct(stage.data.accuracy)}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Math -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-emerald-700 uppercase"
				>
					Арифметика
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Среднее</span>
						<span class="tabular-nums">{fmt(m.math.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">σ</span>
						<span class="tabular-nums">{fmt(m.math.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Точность</span>
						<span
							class="tabular-nums {m.math.accuracy >= 0.8
								? 'text-green-700'
								: m.math.accuracy >= 0.5
									? 'text-amber-700'
									: 'text-red-700'}"
						>
							{pct(m.math.accuracy)}
						</span>
					</div>
				</div>
			</div>

			<!-- Munsterberg -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-amber-700 uppercase"
				>
					Мюнстерберг
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Среднее</span>
						<span class="tabular-nums">{fmt(m.munsterberg.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">σ</span>
						<span class="tabular-nums">{fmt(m.munsterberg.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Доля</span>
						<span class="tabular-nums">{pct(m.munsterberg.fractionGuessed)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Кол-во</span>
						<span class="tabular-nums">{m.munsterberg.totalWordsHidden}</span>
					</div>
				</div>
			</div>

			<!-- Campimetry -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-rose-700 uppercase"
				>
					Кампиметрия
				</h4>
				<div class="flex flex-col gap-1.5 text-sm">
					{#each [{ label: 'Этап 1', data: m.campimetry.stage1 }, { label: 'Этап 2', data: m.campimetry.stage2 }] as stage (stage.label)}
						<div class="flex flex-col gap-1">
							<span class="text-xs text-gray-500">{stage.label}</span>
							<div class="flex items-center gap-2 pl-2">
								<span class="tabular-nums">{fmt(stage.data.meanTime)}с</span>
								<span class="text-xs text-gray-500"
									>σ{fmt(stage.data.stdDevTime)}</span
								>
								<span class="text-xs text-gray-500"
									>δ{fmt(stage.data.meanDelta)}</span
								>
							</div>
						</div>
					{/each}
					<div class="mt-1 border-t border-gray-200 pt-1">
						<span class="text-xs text-gray-500">Разброс (эт. 2)</span>
						<div class="flex gap-3 pl-2 text-xs">
							<span class="text-amber-700"
								>Недож: {m.campimetry.stage2Breakdown.underPress}</span
							>
							<span class="text-green-700"
								>Точно: {m.campimetry.stage2Breakdown.exact}</span
							>
							<span class="text-red-700"
								>Переж: {m.campimetry.stage2Breakdown.overPress}</span
							>
						</div>
					</div>
				</div>
			</div>

			<!-- Memory -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-cyan-700 uppercase"
				>
					Память
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Среднее</span>
						<span class="tabular-nums">{fmt(m.memory.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">σ</span>
						<span class="tabular-nums">{fmt(m.memory.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Точность</span>
						<span
							class="tabular-nums {m.memory.accuracy >= 0.8
								? 'text-green-700'
								: m.memory.accuracy >= 0.5
									? 'text-amber-700'
									: 'text-red-700'}"
						>
							{pct(m.memory.accuracy)}
						</span>
					</div>
				</div>
			</div>

			<!-- Swallow -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-teal-700 uppercase"
				>
					Ласточка
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Среднее</span>
						<span class="tabular-nums">{fmt(m.swallow.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">σ</span>
						<span class="tabular-nums">{fmt(m.swallow.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-500">Точность</span>
						<span
							class="tabular-nums {m.swallow.accuracy >= 0.8
								? 'text-green-700'
								: m.swallow.accuracy >= 0.5
									? 'text-amber-700'
									: 'text-red-700'}"
						>
							{pct(m.swallow.accuracy)}
						</span>
					</div>
				</div>
			</div>

			<!-- Raven -->
			<div
				class="rounded-xl border border-gray-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
			>
				<h4
					class="mb-2 text-center text-xs font-semibold tracking-wider text-violet-700 uppercase"
				>
					Матрицы Равена
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-gray-500">Всего</span>
						<span class="tabular-nums"
							>{m.raven.correctCount}/{m.raven.totalQuestions}</span
						>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-gray-500">Точность</span>
						<span
							class="tabular-nums {m.raven.accuracy >= 0.8
								? 'text-green-700'
								: m.raven.accuracy >= 0.5
									? 'text-amber-700'
									: 'text-red-700'}"
						>
							{pct(m.raven.accuracy)}
						</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-gray-500">Среднее</span>
						<span class="tabular-nums"
							>{fmt(m.raven.averageResponseTimeMs / 1000)}с</span
						>
					</div>
				</div>

				<div class="mt-2 border-t border-gray-200 pt-2">
					<span class="text-xs text-gray-500">По сложности</span>
					<div class="mt-1 grid grid-cols-3 gap-2 text-xs">
						<div>
							<span class="text-gray-500">Легкие</span>
							<div class="tabular-nums">
								{m.raven.byDifficulty.level1.correct}/{m.raven.byDifficulty.level1
									.total}
							</div>
						</div>
						<div>
							<span class="text-gray-500">Средние</span>
							<div class="tabular-nums">
								{m.raven.byDifficulty.level2.correct}/{m.raven.byDifficulty.level2
									.total}
							</div>
						</div>
						<div>
							<span class="text-gray-500">Сложные</span>
							<div class="tabular-nums">
								{m.raven.byDifficulty.level3.correct}/{m.raven.byDifficulty.level3
									.total}
							</div>
						</div>
					</div>
				</div>

				{#if Object.keys(m.raven.byTaskClass).length > 0}
					<div class="mt-2 border-t border-gray-200 pt-2">
						<span class="text-xs text-gray-500">По классу задач</span>
						<div class="mt-1 flex flex-col gap-0.5 text-xs">
							{#each Object.entries(m.raven.byTaskClass) as [tc, info] (tc)}
								<div class="flex items-center justify-between">
									<span class="text-gray-500">{info.label}</span>
									<span class="tabular-nums">{info.correct}/{info.total}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Editable metrics (read-only) -->
		<div class="rounded-lg border border-gray-200 bg-white/40 p-4">
			<h4
				class="mb-3 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase"
			>
				Дополнительные данные
			</h4>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Тест на баланс</span>
					<span class="text-sm">{m.editableMetrics.balanceTest ?? '—'}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Лабиринт Q1</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeQ1 !== null ? m.editableMetrics.mazeQ1 : '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Лабиринт Q2</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeQ2 !== null ? m.editableMetrics.mazeQ2 : '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Лабиринт Q3</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeQ3 !== null ? m.editableMetrics.mazeQ3 : '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Лабиринт VR №</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeVRNumber !== null
							? m.editableMetrics.mazeVRNumber
							: '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Лабиринт VR файл</span>
					<span class="truncate text-sm">{m.editableMetrics.mazeVRFileName ?? '—'}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Кнопочки №</span>
					<span class="text-sm"
						>{m.editableMetrics.buttonTestNumber !== null
							? m.editableMetrics.buttonTestNumber
							: '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Кнопочки файл</span>
					<span class="truncate text-sm"
						>{m.editableMetrics.buttonTestFileName ?? '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-500">Логика</span>
					<span class="text-sm"
						>{m.editableMetrics.logic !== null ? m.editableMetrics.logic : '—'}</span
					>
				</div>
			</div>
		</div>
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="red" goto="/gto">Назад к списку сессий</Button>
</section>
