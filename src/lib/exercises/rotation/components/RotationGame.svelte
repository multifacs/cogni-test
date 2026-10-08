<script lang="ts">
	import { onMount } from 'svelte';
	import { generateRotationSession } from '../logic/generator';
	import { DIFFICULTY_LEVEL } from '../types';
	import type { RotationAnswerRow, RotationTask } from '../types';
	import ProjectionView from './ProjectionView.svelte';
	import VoxelRender from './VoxelRender.svelte';

	let {
		gameEnd,
		sendResults,
		taskMs = 15000
	}: {
		gameEnd: () => void;
		sendResults: (results: Record<string, unknown>[]) => void;
		taskMs?: number;
	} = $props();

	let tasks = $state<RotationTask[]>([]);
	let currentIndex = $state(0);
	let answers = $state<RotationAnswerRow[]>([]);
	let isLocked = $state(false);
	let isFinished = $state(false);
	let timeLeftMs = $state(0);
	let questionStartedAt = 0;

	let currentTask = $derived(tasks[currentIndex]);
	let timeLeftPct = $derived(Math.max(0, Math.min(100, (timeLeftMs / taskMs) * 100)));

	onMount(() => {
		// Fresh session per mount: the route re-mounts this component on slug change.
		tasks = generateRotationSession();
		currentIndex = 0;
		answers = [];
		isLocked = false;
		isFinished = false;
		timeLeftMs = taskMs;
	});

	// One countdown interval per active task; auto-cleaned on task switch, lock and destroy.
	$effect(() => {
		if (!currentTask || isLocked || isFinished) return;

		const startedAt = performance.now();
		questionStartedAt = startedAt;

		const id = window.setInterval(() => {
			// Guard: after a click the interval stays armed until Svelte re-runs the
			// effect (~next flush) — a late tick must not overwrite the recorded answer.
			if (isLocked || isFinished) return;
			const elapsed = performance.now() - startedAt;
			timeLeftMs = Math.max(0, taskMs - elapsed);
			if (elapsed >= taskMs) {
				// Stop ticking immediately: do not let a stale tick record a timeout
				// over (or after) an answer that landed just before the deadline.
				window.clearInterval(id);
				timeLeftMs = 0;
				recordAnswer(null, true);
				advance();
			}
		}, 100);

		return () => window.clearInterval(id);
	});

	function recordAnswer(selectedIndex: number | null, timedOut: boolean) {
		const task = tasks[currentIndex];
		if (!task) return;

		answers = [
			...answers,
			{
				taskIndex: task.taskIndex,
				difficultyLevel: DIFFICULTY_LEVEL[task.difficulty],
				gridSize: task.gridSize,
				selectedIndex,
				correctIndex: task.correctIndex,
				isCorrect: selectedIndex !== null && selectedIndex === task.correctIndex,
				responseTimeMs: Math.max(0, Math.round(performance.now() - questionStartedAt)),
				timedOut,
				seed: task.seed
			}
		];
	}

	function selectOption(index: number) {
		if (!currentTask || isLocked || isFinished) return;

		isLocked = true;
		recordAnswer(index, false);
		window.setTimeout(advance, 400);
	}

	function advance() {
		if (isFinished) return;
		if (currentIndex >= tasks.length - 1) {
			finish();
			return;
		}

		currentIndex += 1;
		isLocked = false;
		timeLeftMs = taskMs;
	}

	function finish() {
		isFinished = true;
		sendResults(answers);
		gameEnd();
	}
</script>

{#if currentTask}
	<section class="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 text-slate-800">
		<header
			class="flex w-full flex-col items-start justify-between gap-2.5 rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-orange-50 px-3 py-3 sm:flex-row sm:items-start"
		>
			<div>
				<p
					data-testid="rotation-counter"
					class="m-0 text-xs font-extrabold tracking-wider text-slate-500 uppercase"
				>
					Задание {currentIndex + 1}/{tasks.length}
				</p>
				<h2 class="text-lg leading-snug text-gray-900">Выберите фигуру по проекциям</h2>
			</div>
		</header>

		<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
			<span
				style={`width: ${timeLeftPct}%`}
				class="block h-full rounded-full bg-linear-to-r from-blue-400 to-emerald-400 transition-all duration-100 ease-linear"
			></span>
		</div>

		<!-- Mobile: stacked; sm+: reference panel next to the options -->
		<div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
			<div
				class="flex flex-col gap-2 rounded-xl border border-slate-300/25 bg-linear-to-br from-blue-50 to-purple-50 p-3 shadow-md"
				aria-label="Эталонные проекции"
			>
				<p class="m-0 text-center text-xs font-semibold text-slate-500">
					Эталонные проекции
				</p>
				<div class="flex items-end justify-center gap-4">
					<figure class="m-0 flex w-24 flex-col items-center gap-1 sm:w-32">
						<figcaption class="text-xs text-slate-600">Спереди</figcaption>
						<ProjectionView structure={currentTask.structure} view="front" />
					</figure>
					<figure class="m-0 flex w-24 flex-col items-center gap-1 sm:w-32">
						<figcaption class="text-xs text-slate-600">Справа</figcaption>
						<ProjectionView structure={currentTask.structure} view="right" />
					</figure>
				</div>
			</div>

			<div class="grid grid-cols-2 content-start gap-3" aria-label="Варианты ответа">
				{#each currentTask.options as option, i (i)}
					<button
						type="button"
						data-testid={`rotation-option-${i}`}
						aria-label={`Вариант ${i + 1}`}
						disabled={isLocked}
						class="flex items-center justify-center rounded-xl border border-slate-300/25 bg-white p-1.5 shadow-sm transition-transform duration-150 hover:scale-[1.02] hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none disabled:opacity-60"
						onclick={() => selectOption(i)}
					>
						<VoxelRender
							cells={option}
							gridSize={currentTask.gridSize}
							rotation={currentTask.rotation}
						/>
					</button>
				{/each}
			</div>
		</div>
	</section>
{/if}
