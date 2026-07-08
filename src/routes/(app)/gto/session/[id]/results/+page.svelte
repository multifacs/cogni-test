<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function fmt(val: number | null, decimals = 2): string {
		if (val === null) return '—';
		return val.toFixed(decimals);
	}

	function pct(val: number): string {
		return (val * 100).toFixed(1) + '%';
	}

	const m = $derived(data.metrics);
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">{data.session.name}</h1>
	<p class="text-sm opacity-60">Результаты тестирования</p>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-5">
		<!-- Word score -->
		{#if m.wordScore !== null}
			<div class="rounded-xl border border-purple-700/40 bg-purple-900/20 p-4">
				<h3 class="mb-2 text-sm font-semibold text-purple-300">Последовательность слов</h3>
				<div class="flex items-center gap-3">
					<span class="text-3xl font-bold text-purple-200">{m.wordScore}</span>
					<span class="text-sm text-purple-400">из 5 слов</span>
				</div>
				{#if m.submittedWords}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each m.submittedWords as word, i (i)}
							<span
								class="rounded-md bg-purple-800/40 px-2 py-0.5 text-sm text-purple-200"
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
			<div class="rounded-lg bg-gray-900/50 p-3">
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
					Струп
				</h4>
				<div class="flex flex-col gap-1.5 text-sm">
					{#each [{ label: 'Этап 1', data: m.stroop.stage1 }, { label: 'Этап 2', data: m.stroop.stage2 }, { label: 'Этап 3', data: m.stroop.stage3 }] as stage (stage.label)}
						<div class="flex items-center gap-2">
							<span class="w-16 shrink-0 text-xs text-gray-400">{stage.label}</span>
							<span class="tabular-nums">{fmt(stage.data.meanTime)}с</span>
							<span class="text-xs text-gray-500">σ{fmt(stage.data.stdDevTime)}</span>
							<span
								class="ml-auto tabular-nums {stage.data.accuracy >= 0.8
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
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
					Арифметика
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Среднее</span>
						<span class="tabular-nums">{fmt(m.math.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">σ</span>
						<span class="tabular-nums">{fmt(m.math.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Точность</span>
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
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
					Мюнстерберг
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Среднее</span>
						<span class="tabular-nums">{fmt(m.munsterberg.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">σ</span>
						<span class="tabular-nums">{fmt(m.munsterberg.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Доля</span>
						<span class="tabular-nums">{pct(m.munsterberg.fractionGuessed)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Кол-во</span>
						<span class="tabular-nums">{m.munsterberg.totalWordsHidden}</span>
					</div>
				</div>
			</div>

			<!-- Campimetry -->
			<div class="rounded-lg bg-gray-900/50 p-3">
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
					Кампиметрия
				</h4>
				<div class="flex flex-col gap-1.5 text-sm">
					{#each [{ label: 'Этап 1', data: m.campimetry.stage1 }, { label: 'Этап 2', data: m.campimetry.stage2 }] as stage (stage.label)}
						<div class="flex flex-col gap-1">
							<span class="text-xs text-gray-400">{stage.label}</span>
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
					<div class="mt-1 border-t border-gray-700 pt-1">
						<span class="text-xs text-gray-400">Разброс (эт. 2)</span>
						<div class="flex gap-3 pl-2 text-xs">
							<span class="text-yellow-400"
								>Недож: {m.campimetry.stage2Breakdown.underPress}</span
							>
							<span class="text-green-400"
								>Точно: {m.campimetry.stage2Breakdown.exact}</span
							>
							<span class="text-red-400"
								>Переж: {m.campimetry.stage2Breakdown.overPress}</span
							>
						</div>
					</div>
				</div>
			</div>

			<!-- Memory -->
			<div class="rounded-lg bg-gray-900/50 p-3">
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
					Память
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Среднее</span>
						<span class="tabular-nums">{fmt(m.memory.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">σ</span>
						<span class="tabular-nums">{fmt(m.memory.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Точность</span>
						<span
							class="tabular-nums {m.memory.accuracy >= 0.8
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
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
					Ласточка
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Среднее</span>
						<span class="tabular-nums">{fmt(m.swallow.meanTime)}с</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">σ</span>
						<span class="tabular-nums">{fmt(m.swallow.stdDevTime)}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-16 shrink-0 text-xs text-gray-400">Точность</span>
						<span
							class="tabular-nums {m.swallow.accuracy >= 0.8
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
				<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
					Матрицы Равена
				</h4>
				<div class="flex flex-col gap-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-gray-400">Всего</span>
						<span class="tabular-nums"
							>{m.raven.correctCount}/{m.raven.totalQuestions}</span
						>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-gray-400">Точность</span>
						<span
							class="tabular-nums {m.raven.accuracy >= 0.8
								? 'text-green-400'
								: m.raven.accuracy >= 0.5
									? 'text-yellow-400'
									: 'text-red-400'}"
						>
							{pct(m.raven.accuracy)}
						</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-gray-400">Среднее</span>
						<span class="tabular-nums"
							>{fmt(m.raven.averageResponseTimeMs / 1000)}с</span
						>
					</div>
				</div>

				<div class="mt-2 border-t border-gray-700 pt-2">
					<span class="text-xs text-gray-400">По сложности</span>
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
					<div class="mt-2 border-t border-gray-700 pt-2">
						<span class="text-xs text-gray-400">По классу задач</span>
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
		<div class="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
			<h4 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
				Дополнительные данные
			</h4>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Тест на баланс</span>
					<span class="text-sm">{m.editableMetrics.balanceTest ?? '—'}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Лабиринт Q1</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeQ1 !== null ? m.editableMetrics.mazeQ1 : '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Лабиринт Q2</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeQ2 !== null ? m.editableMetrics.mazeQ2 : '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Лабиринт Q3</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeQ3 !== null ? m.editableMetrics.mazeQ3 : '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Лабиринт VR №</span>
					<span class="text-sm"
						>{m.editableMetrics.mazeVRNumber !== null
							? m.editableMetrics.mazeVRNumber
							: '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Лабиринт VR файл</span>
					<span class="text-sm truncate">{m.editableMetrics.mazeVRFileName ?? '—'}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Кнопочки №</span>
					<span class="text-sm"
						>{m.editableMetrics.buttonTestNumber !== null
							? m.editableMetrics.buttonTestNumber
							: '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Кнопочки файл</span>
					<span class="text-sm truncate"
						>{m.editableMetrics.buttonTestFileName ?? '—'}</span
					>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Логика</span>
					<span class="text-sm"
						>{m.editableMetrics.logic !== null ? m.editableMetrics.logic : '—'}</span
					>
				</div>
			</div>
		</div>
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="gray" goto="/gto">← Сессии ГТО-М</Button>
</section>
