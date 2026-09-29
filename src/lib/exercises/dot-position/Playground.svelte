<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import type { MetaResult } from '$lib/exercises/types';
	import type { DotPositionResult } from './types';
	import {
		buildMeta,
		createRoundState,
		evaluateRound,
		nextRound,
		normalizeTap,
		STAGES,
		TIME_MEMORIZE_MS,
		TIME_RESPOND_MS
	} from './logic/engine';

	let {
		gameEnd,
		sendResults,
		memorizeMs = TIME_MEMORIZE_MS,
		respondMs = TIME_RESPOND_MS,
		rng = Math.random
	}: {
		gameEnd: () => void;
		sendResults?: (payload: MetaResult) => void;
		/** Инъекция длительности фазы запоминания (тесты ускоряют, прод — константа движка). */
		memorizeMs?: number;
		/** Инъекция длительности фазы ответа (тесты ускоряют, прод — константа движка). */
		respondMs?: number;
		/** Инъекция ГПСЧ: тесты передают детерминированный, прод — Math.random. */
		rng?: () => number;
	} = $props();

	let panel: HTMLElement | null = $state(null);
	// rng снапшотится при создании компонента: ГПСЧ упражнения выбирается один
	// раз и не меняется в процессе игры.
	// svelte-ignore state_referenced_locally
	let game = $state(createRoundState(rng));
	// Реальные значения фаз устанавливает startPhase() в onMount — до первой
	// отрисовки; константы здесь лишь безопасные заглушки типов.
	let phaseDuration = $state(TIME_MEMORIZE_MS);
	let timeLeft = $state(TIME_MEMORIZE_MS);

	// Аккумулятор результатов: раунды идут строго последовательно, поэтому
	// обычного массива достаточно; пересоздаётся вместе с компонентом.
	let results: DotPositionResult[] = [];
	let respondStart = 0;
	let deadline = 0;
	let phaseTimer: ReturnType<typeof setTimeout> | undefined;
	let progressTimer: ReturnType<typeof setInterval> | undefined;

	const grid = $derived(STAGES[game.stage - 1].grid);
	const isMemorize = $derived(game.phase === 'memorize');

	onMount(() => {
		startPhase();
	});

	onDestroy(() => {
		clearTimers();
	});

	function clearTimers() {
		clearTimeout(phaseTimer);
		clearInterval(progressTimer);
	}

	/** Запускает таймеры текущей фазы: memorize → скрытие, respond → таймаут. */
	function startPhase() {
		clearTimers();
		phaseDuration = game.phase === 'respond' ? respondMs : memorizeMs;
		deadline = performance.now() + phaseDuration;
		timeLeft = phaseDuration;
		if (game.phase === 'memorize') {
			phaseTimer = setTimeout(hideDot, memorizeMs);
		} else if (game.phase === 'respond') {
			respondStart = performance.now();
			phaseTimer = setTimeout(timeoutRound, respondMs);
		}
		progressTimer = setInterval(() => {
			timeLeft = Math.max(0, deadline - performance.now());
		}, 100);
	}

	function hideDot() {
		game.phase = 'respond';
		startPhase();
	}

	function timeoutRound() {
		advance(evaluateRound(game, null, respondMs));
	}

	function handleTap(event: PointerEvent) {
		// Ввод валиден только в respond-фазе: memorize-тапы игнорируются,
		// evaluateRound иначе бросает (fail-fast guard движка).
		if (game.phase !== 'respond' || !panel) return;
		const rect = panel.getBoundingClientRect();
		const tap = normalizeTap(
			{ width: rect.width, height: rect.height },
			event.clientX,
			event.clientY,
			rect.left,
			rect.top
		);
		advance(evaluateRound(game, tap, performance.now() - respondStart));
	}

	function advance(result: DotPositionResult) {
		results.push(result);
		game = nextRound(game, result, rng);
		if (game.phase === 'finished') {
			finish();
		} else {
			startPhase();
		}
	}

	function finish() {
		clearTimers();
		sendResults?.({ results, meta: buildMeta() });
		gameEnd();
	}
</script>

<div class="flex w-full max-w-md flex-col items-center gap-3">
	<div class="flex w-full items-center justify-between text-sm" aria-live="polite">
		<span>Этап {game.stage} из {STAGES.length}</span>
		<span>Верно: {game.correctCount}</span>
		<span>Ошибок: {game.errorCount}</span>
	</div>

	<button
		type="button"
		bind:this={panel}
		class="dot-panel relative aspect-square w-full touch-none overflow-hidden rounded-2xl bg-white select-none {isMemorize
			? 'cursor-none'
			: 'cursor-pointer'}"
		data-phase={game.phase}
		data-grid={grid}
		aria-label="Игровое поле: запомните позицию точки и укажите её после скрытия"
		onpointerdown={handleTap}
	>
		{#if grid > 0}
			<!-- Декоративная сетка-ориентир; тапы по ячейкам всплывают к панели -->
			<div
				class="grid-overlay absolute inset-0 grid"
				style="grid-template-columns: repeat({grid}, 1fr); grid-template-rows: repeat({grid}, 1fr);"
				aria-hidden="true"
			>
				{#each Array(grid * grid).entries() as [index] (index)}
					<div class="border border-slate-200"></div>
				{/each}
			</div>
		{/if}

		{#if isMemorize}
			<div
				class="pointer-events-none absolute z-10 rounded-full bg-[#F26D6D]"
				style="left: {game.position.x * 100}%; top: {game.position.y *
					100}%; width: 3.5%; aspect-ratio: 1; transform: translate(-50%, -50%);"
			></div>
		{/if}
	</button>

	{#if game.phase !== 'finished'}
		<ProgressBar min={0} max={phaseDuration} progress={timeLeft} />
	{/if}
</div>
