<script lang="ts">
	import { onMount } from 'svelte';
	import { generateRavenTest } from './logic/generator';
	import { taskClassLabel } from './results-adapter';
	import RavenAnswerOptions from './RavenAnswerOptions.svelte';
	import RavenMatrixBoard from './RavenMatrixBoard.svelte';
	import type {
		GeneratedRavenTask,
		RavenAnswerRecord,
		RavenTestGenerationOptions
	} from './types';

	let {
		gameEnd,
		sendResults,
		options = { count: 10, mode: 'default', answerCount: 6 }
	}: {
		gameEnd: () => void;
		sendResults: (results: Record<string, unknown>[]) => void;
		options?: RavenTestGenerationOptions;
	} = $props();

	let tasks = $state<GeneratedRavenTask[]>([]);
	let currentIndex = $state(0);
	let selectedIndex: number | null = $state(null);
	let answers = $state<RavenAnswerRecord[]>([]);
	let testStartedAt = $state(0);
	let questionStartedAt = $state(0);
	let isStarted = $state(false);
	let isLocked = $state(false);

	let currentTask = $derived(tasks[currentIndex]);
	let progress = $derived(tasks.length ? ((currentIndex + 1) / tasks.length) * 100 : 0);
	let currentLabel = $derived(currentTask ? taskClassLabel(currentTask.taskClass) : '');

	onMount(() => {
		prepareTest();
	});

	function prepareTest() {
		tasks = generateRavenTest({ count: 10, answerCount: 6, ...options });
		currentIndex = 0;
		selectedIndex = null;
		answers = [];
		isStarted = false;
		isLocked = false;
	}

	function start() {
		testStartedAt = performance.now();
		questionStartedAt = performance.now();
		isStarted = true;
	}

	function selectAnswer(index: number) {
		if (!currentTask || isLocked || selectedIndex !== null) return;

		selectedIndex = index;
		isLocked = true;

		const responseTimeMs = Math.round(performance.now() - questionStartedAt);
		const option = currentTask.answerOptions[index];
		const isCorrect = index === currentTask.correctIndex;

		answers = [
			...answers,
			{
				taskId: currentTask.id,
				taskIndex: currentTask.taskIndex,
				taskClass: currentTask.taskClass,
				difficultyLevel: currentTask.difficulty.estimatedLevel,
				difficultyScore: currentTask.difficulty.estimatedScore,
				rules: currentTask.rules.map((r) => r.family),
				skillTags: currentTask.analytics.skillTags,
				selectedIndex: index,
				correctIndex: currentTask.correctIndex,
				selectedFamily: option?.family ?? null,
				isCorrect,
				responseTimeMs,
				seed: currentTask.seed
			}
		];

		window.setTimeout(nextQuestion, 360);
	}

	function nextQuestion() {
		if (currentIndex >= tasks.length - 1) {
			finish();
			return;
		}

		currentIndex += 1;
		selectedIndex = null;
		isLocked = false;
		questionStartedAt = performance.now();
	}

	function finish() {
		sendResults(
			answers.map((a) => ({
				taskId: a.taskId,
				taskIndex: a.taskIndex,
				taskClass: a.taskClass,
				difficultyLevel: a.difficultyLevel,
				difficultyScore: a.difficultyScore,
				rules: JSON.stringify(a.rules),
				skillTags: JSON.stringify(a.skillTags),
				selectedIndex: a.selectedIndex ?? null,
				correctIndex: a.correctIndex,
				selectedFamily: a.selectedFamily ?? null,
				isCorrect: a.isCorrect,
				responseTimeMs: a.responseTimeMs,
				seed: a.seed
			}))
		);
		gameEnd();
	}
</script>

{#if !isStarted}
	<section
		class="flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-slate-300/30 bg-linear-to-br from-orange-50 to-blue-50 p-4 text-slate-800 shadow-lg"
	>
		<div class="flex flex-col items-center justify-center gap-1">
			<h1 class="text-3xl leading-tight text-gray-900">Матрицы Равена</h1>
			<p class="max-w-prose text-base leading-relaxed text-slate-500">
				В каждом задании одна ячейка матрицы скрыта. Найдите правило и выберите недостающий
				вариант.
			</p>
		</div>

		<div class="flex flex-wrap gap-2" aria-label="Параметры теста">
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
				>{options.count ?? 10} заданий</span
			>
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
				>{options.answerCount ?? 6} вариантов</span
			>
			<span
				class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
				>случайная смесь</span
			>
		</div>

		<button
			class="cursor-pointer rounded-xl border-0 bg-slate-800 px-4 py-3 font-extrabold text-white"
			type="button"
			onclick={start}>Начать</button
		>
	</section>
{:else if currentTask}
	<section
		class="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-2 text-slate-800"
	>
		<header
			class="flex w-full flex-col items-start justify-between gap-2.5 rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-orange-50 px-3 py-3 md:flex-row md:items-start"
		>
			<div>
				<p class="m-0 text-xs font-extrabold tracking-wider text-slate-500 uppercase">
					Задание {currentIndex + 1} из {tasks.length}
				</p>
				<h2 class="text-lg leading-snug text-gray-900">Выберите недостающую ячейку</h2>
			</div>
			<div class="flex flex-wrap gap-1.5 md:justify-end">
				<span
					class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
					>Сложность {currentTask.difficulty.estimatedLevel}</span
				>
				<span
					class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
					>{currentLabel}</span
				>
			</div>
		</header>

		<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
			<span
				style={`width: ${progress}%`}
				class="rounded-inherit block h-full bg-linear-to-r from-blue-400 to-emerald-400 transition-all duration-200 ease-out"
			></span>
		</div>

		<!-- Mobile: stacked (2 rows); Desktop: side-by-side (2 columns) -->
		<div class="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
			<div
				class="flex items-center justify-center rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-purple-50 p-2 shadow-md"
				aria-label="Задание"
			>
				<RavenMatrixBoard task={currentTask} />
			</div>
			<div
				class="flex items-center justify-center rounded-xl border border-slate-300/25 bg-linear-to-br from-orange-50 to-slate-50 p-3 shadow-md"
				aria-label="Варианты ответа"
			>
				<RavenAnswerOptions
					task={currentTask}
					{selectedIndex}
					{isLocked}
					onselect={selectAnswer}
				/>
			</div>
		</div>
	</section>
{/if}
