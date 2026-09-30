<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import type { MetaResult } from '$lib/exercises/types';
	import type { DotPositionResult } from './types';
	import {
		buildMeta,
		createRoundState,
		DOTS_PER_STAGE,
		evaluateRound,
		nextRound,
		normalizeTap,
		STAGES,
		TIME_INTRO_MS,
		TIME_MEMORIZE_MS,
		TIME_RESPOND_MS,
		TIME_WAIT_MS
	} from './logic/engine';

	let {
		gameEnd,
		sendResults,
		introMs = TIME_INTRO_MS,
		memorizeMs = TIME_MEMORIZE_MS,
		waitMs = TIME_WAIT_MS,
		respondMs = TIME_RESPOND_MS,
		rng = Math.random
	}: {
		gameEnd: () => void;
		sendResults?: (payload: MetaResult) => void;
		/** Инъекция длительности intro-паузы перед первым раундом (тесты ускоряют, прод — константа движка). */
		introMs?: number;
		/** Инъекция длительности фазы запоминания (тесты ускоряют, прод — константа движка). */
		memorizeMs?: number;
		/** Инъекция длительности паузы после скрытия точки (тесты ускоряют, прод — константа движка). */
		waitMs?: number;
		/** Инъекция длительности фазы ответа (тесты ускоряют, прод — константа движка). */
		respondMs?: number;
		/** Инъекция ГПСЧ: тесты передают детерминированный, прод — Math.random. */
		rng?: () => number;
	} = $props();

	/** Всего раундов: по DOTS_PER_STAGE на каждый этап. */
	const TOTAL_ROUNDS = DOTS_PER_STAGE * STAGES.length;

	/** Цвет кружка-прогресса по этапу: slate-400 / sky-500 / amber-500. */
	const STAGE_DOT_COLORS: readonly [string, string, string] = ['#94a3b8', '#0ea5e9', '#f59e0b'];

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
	const isIntro = $derived(game.phase === 'intro');
	const isMemorize = $derived(game.phase === 'memorize');
	// Анти-чит: курсор скрыт, пока точка видна или вот-вот должна появиться
	// снова — нельзя «припарковать» его на месте точки.
	const isWait = $derived(game.phase === 'wait');
	const isRespond = $derived(game.phase === 'respond');
	const phaseLabel = $derived(
		game.phase === 'intro'
			? 'Начинаем'
			: game.phase === 'memorize'
				? 'Запоминай'
				: isWait
					? 'Приготовься'
					: 'Отвечай'
	);
	// Бар показывает пройденную часть фазы: растёт 0→100% слева направо.
	const elapsed = $derived(phaseDuration - timeLeft);

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

	/** Запускает таймеры текущей фазы: intro → memorize → wait → respond → таймаут раунда. */
	function startPhase() {
		clearTimers();
		phaseDuration = isIntro ? introMs : isMemorize ? memorizeMs : isWait ? waitMs : respondMs;
		deadline = performance.now() + phaseDuration;
		timeLeft = phaseDuration;
		if (isIntro) {
			// Позиция первой точки уже в game.position от createRoundState —
			// rng/nextRound здесь не вызываются, intro только держит паузу.
			phaseTimer = setTimeout(nextPhase, introMs);
		} else if (isMemorize) {
			phaseTimer = setTimeout(nextPhase, memorizeMs);
		} else if (isWait) {
			phaseTimer = setTimeout(nextPhase, waitMs);
		} else if (isRespond) {
			respondStart = performance.now();
			phaseTimer = setTimeout(timeoutRound, respondMs);
		}
		progressTimer = setInterval(() => {
			timeLeft = Math.max(0, deadline - performance.now());
		}, 100);
	}

	/** Переход к следующей фазе раунда: intro → memorize → wait → respond. */
	function nextPhase() {
		game.phase = isIntro ? 'memorize' : isMemorize ? 'wait' : 'respond';
		startPhase();
	}

	function timeoutRound() {
		advance(evaluateRound(game, null, respondMs));
	}

	function handleTap(event: PointerEvent) {
		// Ввод валиден только в respond-фазе: тапы в memorize и wait — тихий
		// игнор, evaluateRound иначе бросает (fail-fast guard движка).
		if (!isRespond || !panel) return;
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

	/** Состояние кружка по номеру раунда: пройденный / текущий / будущий. */
	function dotState(attempt: number): 'past' | 'current' | 'future' {
		if (attempt < game.attempt) return 'past';
		return attempt === game.attempt ? 'current' : 'future';
	}
</script>

<div class="flex w-full max-w-md flex-col items-center gap-3">
	{#if game.phase !== 'finished'}
		<!-- Кружки-прогресс: один на раунд, цвет = этап. Корректность НЕ
		     кодируется — кружки не говорят, попал ли игрок в раунде. -->
		<div class="flex items-center justify-center gap-2" aria-hidden="true">
			{#each { length: TOTAL_ROUNDS } as _, index (index)}
				{@const attempt = index + 1}
				{@const stage = Math.floor(index / DOTS_PER_STAGE) + 1}
				{@const state = dotState(attempt)}
				<span
					class="progress-dot progress-dot-{state}"
					style={`--dot-color: ${STAGE_DOT_COLORS[stage - 1]}`}
					data-attempt={attempt}
					data-stage={stage}
					data-state={state}
				></span>
			{/each}
		</div>

		<!-- Фраза состояния над полем: режим фазы без счётчиков. -->
		<p
			class="phase-phrase text-sm font-medium text-slate-600"
			aria-live="polite"
			data-phase={game.phase}
		>
			{phaseLabel}
		</p>
	{/if}

	<button
		type="button"
		bind:this={panel}
		class="dot-panel relative aspect-square w-full touch-none overflow-hidden rounded-2xl select-none {isRespond
			? 'cursor-pointer bg-green-50'
			: 'cursor-none bg-white'}"
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
		<ProgressBar min={0} max={phaseDuration} progress={elapsed} />
	{/if}
</div>

<style>
	.progress-dot {
		width: 14px;
		height: 14px;
		border-radius: 9999px;
		background-color: var(--dot-color);
		transition:
			box-shadow 0.15s,
			transform 0.15s,
			opacity 0.15s;
	}

	/* Будущий раунд: полупрозрачный контур цвета этапа. */
	.progress-dot-future {
		background-color: transparent;
		box-shadow: inset 0 0 0 2px var(--dot-color);
		opacity: 0.55;
	}

	/* Пройденный раунд: заполнен, но приглушён относительно текущего. */
	.progress-dot-past {
		opacity: 0.35;
	}

	/* Текущий раунд: заполнен цветом этапа + кольцо (паттерн campimetry). */
	.progress-dot-current {
		box-shadow:
			0 0 0 3px #fff,
			0 0 0 5px var(--dot-color);
		transform: scale(1.1);
	}
</style>
