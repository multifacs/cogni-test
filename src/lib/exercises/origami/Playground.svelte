<script lang="ts">
	import { onMount } from 'svelte';
	import { generate } from 'short-uuid';
	import { generateOrigamiTask } from './logic/engine';
	import { difficultyLabel } from './results-adapter';
	import type { OrigamiAttemptRow, OrigamiDifficulty, OrigamiTask } from './types';
	import OrigamiOptions from './components/OrigamiOptions.svelte';
	import OrigamiStage from './components/OrigamiStage.svelte';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults?: (results: Record<string, unknown>[]) => void;
	} = $props();

	/** Прогрессия: 3 simple / 3 medium / 2 hard. */
	const DIFFICULTY_PLAN: OrigamiDifficulty[] = [
		'simple',
		'simple',
		'simple',
		'medium',
		'medium',
		'medium',
		'hard',
		'hard'
	];

	let tasks = $state<OrigamiTask[]>([]);
	let currentIndex = $state(0);
	let selectedIndex: number | null = $state(null);
	let answers = $state<OrigamiAttemptRow[]>([]);
	let questionStartedAt = $state(0);
	let isLocked = $state(false);
	let isStageFinished = $state(false);

	let currentTask = $derived(tasks[currentIndex]);
	let progress = $derived(tasks.length ? ((currentIndex + 1) / tasks.length) * 100 : 0);
	let currentLabel = $derived(currentTask ? difficultyLabel(currentTask.difficulty) : '');

	onMount(() => {
		const seed = generate();
		tasks = DIFFICULTY_PLAN.map((difficulty, i) =>
			generateOrigamiTask({ seed, difficulty, taskIndex: i + 1 })
		);
		currentIndex = 0;
		resetQuestion();
	});

	function resetQuestion() {
		selectedIndex = null;
		isLocked = false;
		isStageFinished = false;
		questionStartedAt = performance.now();
	}

	function handleStageFinished() {
		isStageFinished = true;
	}

	function selectOption(index: number) {
		if (!currentTask || isLocked || selectedIndex !== null) return;

		selectedIndex = index;
		isLocked = true;

		const responseTimeMs = Math.round(performance.now() - questionStartedAt);
		answers = [
			...answers,
			{
				taskIndex: currentTask.taskIndex,
				difficulty: currentTask.difficulty,
				folds: JSON.stringify(currentTask.folds),
				selectedIndex: index,
				correctIndex: currentTask.correctIndex,
				isCorrect: index === currentTask.correctIndex,
				responseTimeMs,
				seed: currentTask.seed
			}
		];

		window.setTimeout(nextQuestion, 900);
	}

	function nextQuestion() {
		if (currentIndex >= tasks.length - 1) {
			finish();
			return;
		}

		currentIndex += 1;
		resetQuestion();
	}

	function finish() {
		const results = answers.map((a) => ({ ...a }));
		if (sendResults) {
			sendResults(results);
		} else {
			// Standalone mode: POST to own endpoint
			void fetch('/exercises/origami/playground', {
				method: 'POST',
				body: JSON.stringify({ results }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		gameEnd();
	}
</script>

{#if currentTask}
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
				<h2 class="text-lg leading-snug text-gray-900">Согните лист и проколите его</h2>
			</div>
			<div class="flex flex-wrap gap-1.5 md:justify-end">
				<span
					class="rounded-full bg-white/70 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300/20"
					>Сложность: {currentLabel}</span
				>
			</div>
		</header>

		<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
			<span
				style={`width: ${progress}%`}
				class="rounded-inherit block h-full bg-linear-to-r from-blue-400 to-emerald-400 transition-all duration-200 ease-out"
			></span>
		</div>

		<!-- Mobile: stacked; Desktop: side-by-side -->
		<div class="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
			<div
				class="flex items-center justify-center rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-purple-50 p-2 shadow-md"
				aria-label="Схема сложения"
			>
				<OrigamiStage steps={currentTask.steps} onfinished={handleStageFinished} />
			</div>
			<div
				class="flex items-center justify-center rounded-xl border border-slate-300/25 bg-linear-to-br from-orange-50 to-slate-50 p-3 shadow-md"
				aria-label="Варианты ответа"
			>
				{#if isStageFinished}
					<div class="flex w-full flex-col items-center gap-3">
						<p class="m-0 text-center text-sm text-slate-600">
							Как будет выглядеть развёрнутый лист с дырками?
						</p>
						<OrigamiOptions
							options={currentTask.options}
							correctIndex={currentTask.correctIndex}
							{selectedIndex}
							{isLocked}
							onselect={selectOption}
						/>
					</div>
				{:else}
					<p class="m-0 text-center text-sm text-slate-500">Следите за сгибами…</p>
				{/if}
			</div>
		</div>
	</section>
{/if}
