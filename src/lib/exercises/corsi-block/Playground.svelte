<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import type { MetaResult } from '$lib/exercises/types';
	import {
		ANSWER_TIMEOUT_MS,
		buildMeta,
		createGameState,
		evaluateRound,
		FEEDBACK_MS,
		GAP_MS,
		INTRO_MS,
		nextRound,
		PRESENT_MS,
		SQUARE_SIZE,
		TOTAL_ROUNDS
	} from './logic/engine';
	import type { CorsiBlockResult } from './types';

	let {
		gameEnd,
		sendResults,
		introMs = INTRO_MS,
		presentMs = PRESENT_MS,
		gapMs = GAP_MS,
		feedbackMs = FEEDBACK_MS,
		answerTimeoutMs = ANSWER_TIMEOUT_MS,
		rng = Math.random
	}: {
		/** Локальный финальный экран (контракт страницы playground). */
		gameEnd: () => void;
		/** Сохранение результатов сессии (контракт страницы playground). */
		sendResults?: (payload: MetaResult) => void;
		/** Инъекция длительности intro-паузы перед первым заходом (тесты ускоряют, прод — константа движка). */
		introMs?: number;
		/** Инъекция длительности подсвета одного квадрата (тесты ускоряют, прод — константа движка). */
		presentMs?: number;
		/** Инъекция паузы между подсветами (тесты ускоряют, прод — константа движка). */
		gapMs?: number;
		/** Инъекция длительности фида после ответа (тесты ускоряют, прод — константа движка). */
		feedbackMs?: number;
		/** Инъекция окна ответа; нетап тарифицируется как полный answerTimeoutMs. */
		answerTimeoutMs?: number;
		/** Инъекция ГПСЧ: тесты передают детерминированный, прод — Math.random. */
		rng?: () => number;
	} = $props();

	// rng снапшотится при создании компонента: ГПСЧ упражнения выбирается один
	// раз и не меняется в процессе игры.
	// svelte-ignore state_referenced_locally
	let game = $state(createGameState(rng));

	/** Индекс подсвеченного квадрата; -1 — подсвета выключена (вне шага показа). */
	let litIndex = $state(-1);
	/** Фраза фида зависит от исхода только что завершённого захода. */
	let lastIsCorrect = $state(true);
	// Реальные значения фаз устанавливает startPhase() в onMount — до первой
	// отрисовки; константы здесь лишь безопасные заглушки типов.
	let phaseDuration = $state(INTRO_MS);
	let timeLeft = $state(INTRO_MS);

	// Аккумулятор результатов: заходы идут строго последовательно, поэтому
	// обычного массива достаточно; пересоздаётся вместе с компонентом.
	let results: CorsiBlockResult[] = [];
	// Клики текущего recall: индексы квадратов в порядке нажатия.
	let clicks: number[] = [];
	// Кликнутые квадраты текущего захода (индикатор прогресса ввода): в recall
	// каждый нажатый квадрат остаётся подсвеченным синим до конца фазы,
	// включая feedback (неверный клик должен быть виден в фиде). Сбрасывается
	// на каждом новом заходе. Повторные клики по тому же квадрату легальны —
	// последовательности длины >= 7 могут повторять квадраты.
	const clickedSquares = new SvelteSet<number>();
	let recallStart = 0;
	let deadline = 0;
	let phaseTimer: ReturnType<typeof setTimeout> | undefined;
	let progressTimer: ReturnType<typeof setInterval> | undefined;

	const isPresentation = $derived(game.phase === 'presentation');
	const isRecall = $derived(game.phase === 'recall');
	// Синяя подсветка кликов видна только в recall и последующем feedback —
	// во всех остальных фазах квадраты не синие.
	const showClicked = $derived(game.phase === 'recall' || game.phase === 'feedback');
	const phaseLabel = $derived.by(() => {
		switch (game.phase) {
			case 'intro':
				return 'Приготовься';
			case 'presentation':
				return 'Запоминай';
			case 'recall':
				return 'Повтори';
			case 'feedback':
				return lastIsCorrect ? 'Верно' : 'Ошибка';
			default:
				return '';
		}
	});
	// Бар показывает пройденную часть фазы (растёт 0→100% слева направо, как в
	// dot-position): в presentation это прогресс подсвета, в recall —
	// истёкшая доля окна ответа, т.е. незакрашенный остаток = оставшееся время.
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

	/** Запускает таймеры текущей фазы: intro → presentation → recall → feedback → … */
	function startPhase() {
		clearTimers();
		switch (game.phase) {
			case 'intro':
				phaseDuration = introMs;
				phaseTimer = setTimeout(() => {
					game.phase = 'presentation';
					startPhase();
				}, introMs);
				break;
			case 'presentation':
				// Полный показ: на каждый квадрат presentMs подсвета + gapMs пауза.
				phaseDuration = game.sequence.length * (presentMs + gapMs);
				startPresentation();
				break;
			case 'recall':
				phaseDuration = answerTimeoutMs;
				clicks = [];
				clickedSquares.clear();
				recallStart = performance.now();
				phaseTimer = setTimeout(timeoutRound, answerTimeoutMs);
				break;
			case 'feedback':
				phaseDuration = feedbackMs;
				phaseTimer = setTimeout(proceedAfterFeedback, feedbackMs);
				break;
		}
		deadline = performance.now() + phaseDuration;
		timeLeft = phaseDuration;
		progressTimer = setInterval(() => {
			timeLeft = Math.max(0, deadline - performance.now());
		}, 100);
	}

	/** Шаг показа: подсветить sequence[step], погасить, пауза, следующий. */
	function presentStep(step: number) {
		if (step >= game.sequence.length) {
			game.phase = 'recall';
			startPhase();
			return;
		}
		litIndex = game.sequence[step];
		phaseTimer = setTimeout(() => {
			litIndex = -1;
			phaseTimer = setTimeout(() => presentStep(step + 1), gapMs);
		}, presentMs);
	}

	function startPresentation() {
		litIndex = -1;
		presentStep(0);
	}

	function timeoutRound() {
		// Нетап тарифицируется как полный таймаут — движку пробрасываем answerTimeoutMs.
		finishRound(evaluateRound(game, clicks, answerTimeoutMs));
	}

	function handleSquareClick(index: number) {
		// Ввод валиден только в recall-фазе: клики в presentation и feedback —
		// тихий игнор, evaluateRound иначе бросает (fail-fast guard движка).
		if (!isRecall) return;
		clicks.push(index);
		clickedSquares.add(index);
		const isExpected = index === game.sequence[clicks.length - 1];
		const isComplete = clicks.length === game.sequence.length;
		// Неверный клик завершает раунд немедленно; верный полный — тоже.
		if (!isExpected || isComplete) {
			finishRound(evaluateRound(game, clicks, performance.now() - recallStart));
		}
	}

	function finishRound(result: CorsiBlockResult) {
		results.push(result);
		lastIsCorrect = result.isCorrect;
		litIndex = -1;
		game.phase = 'feedback';
		startPhase();
	}

	function proceedAfterFeedback() {
		game = nextRound(game, results[results.length - 1], rng);
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

	/** Состояние кружка по номеру захода: пройденный / текущий / будущий. */
	function dotState(attempt: number): 'past' | 'current' | 'future' {
		if (attempt < game.attempt) return 'past';
		return attempt === game.attempt ? 'current' : 'future';
	}
</script>

<div class="flex w-full max-w-md flex-col items-center gap-3">
	{#if game.phase !== 'finished'}
		<!-- Кружки-прогресс: один на заход. Корректность НЕ кодируется —
		     кружки не говорят, удался ли заход. -->
		<div class="flex items-center justify-center gap-2" aria-hidden="true">
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each { length: TOTAL_ROUNDS } as _, index (index)}
				{@const attempt = index + 1}
				{@const state = dotState(attempt)}
				<span
					class="progress-dot progress-dot-{state}"
					data-attempt={attempt}
					data-state={state}
				></span>
			{/each}
		</div>

		<!-- Фраза состояния над полем: режим фазы без счётчиков. -->
		<p
			class="phase-phrase text-xl font-semibold text-slate-600"
			aria-live="polite"
			data-phase={game.phase}
		>
			{phaseLabel}
		</p>
	{/if}

	<!-- Панель квадратная: left/top в % корректны по обеим осям; позиция
	     движка — ЦЕНТР квадрата, поэтому translate(-50%, -50%). -->
	<div
		class="relative aspect-square w-full touch-none rounded-2xl bg-slate-100 select-none flex flex-wrap gap-2 p-2"
		data-phase={game.phase}
		aria-label="Игровое поле: запомните порядок подсветки квадратов и повторите его кликами"
	>
		{#each game.board as square, index (index)}
			<button
				type="button"
				class="aspect-square rounded-xl border transition-all duration-150 {showClicked &&
				clickedSquares.has(index)
					? 'border-blue-600 bg-blue-500 shadow-lg'
					: litIndex === index
						? 'border-green-600 bg-green-500 shadow-lg'
						: 'border-slate-200 bg-white'} {isPresentation && litIndex !== index
					? 'opacity-80'
					: ''} {isRecall ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'}"
				style="width: {SQUARE_SIZE * 100}%; height: {SQUARE_SIZE * 100}%;"
				data-square-index={index}
				data-lit={litIndex === index || undefined}
				data-clicked={(showClicked && clickedSquares.has(index)) || undefined}
				aria-label="Квадрат {index + 1}"
				onclick={() => handleSquareClick(index)}
			></button>
		{/each}
	</div>

	{#if game.phase !== 'finished'}
		<ProgressBar min={0} max={phaseDuration} progress={elapsed} />
	{/if}
</div>

<style>
	.progress-dot {
		width: 14px;
		height: 14px;
		border-radius: 9999px;
		background-color: var(--color-green-500);
		transition:
			box-shadow 0.15s,
			transform 0.15s,
			opacity 0.15s;
	}

	/* Будущий заход: полупрозрачный контур. */
	.progress-dot-future {
		background-color: transparent;
		box-shadow: inset 0 0 0 2px var(--color-green-500);
		opacity: 0.55;
	}

	/* Пройденный заход: заполнен, но приглушён относительно текущего. */
	.progress-dot-past {
		opacity: 0.35;
	}

	/* Текущий заход: заполнен + кольцо (паттерн dot-position). */
	.progress-dot-current {
		box-shadow:
			0 0 0 3px #fff,
			0 0 0 5px var(--color-green-500);
		transform: scale(1.1);
	}
</style>
