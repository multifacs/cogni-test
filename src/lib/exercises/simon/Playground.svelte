<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import type { MetaResult } from '$lib/exercises/types';
	import {
		BLOCK1_TRIALS,
		BLOCK2_TRIALS,
		BLOCK3_TRIALS,
		buildMeta,
		buildSession,
		evaluateTrial,
		FEEDBACK_MS,
		INTER_TRIAL_MS,
		RESPONSE_WINDOW_MS,
		TOTAL_TRIALS
	} from './logic/engine';
	import type { SimonColor, SimonPosition, SimonResult, SimonTrial } from './types';

	let {
		gameEnd,
		sendResults,
		introMs = 2000,
		responseWindowMs = RESPONSE_WINDOW_MS,
		feedbackMs = FEEDBACK_MS,
		itiMs = INTER_TRIAL_MS,
		rng = Math.random
	}: {
		/** Локальный финальный экран (контракт страницы playground). */
		gameEnd: () => void;
		/** Сохранение результатов сессии (контракт страницы playground). */
		sendResults?: (payload: MetaResult) => void;
		/** Инъекция длительности экрана инструкции блока (тесты ускоряют). */
		introMs?: number;
		/** Инъекция окна ответа на пробу; нетап тарифицируется как полный windowMs. */
		responseWindowMs?: number;
		/** Инъекция длительности фида после ответа (тесты ускоряют). */
		feedbackMs?: number;
		/** Инъекция межпробного интервала (тесты ускоряют). */
		itiMs?: number;
		/** Инъекция ГПСЧ: тесты передают детерминированный, прод — Math.random. */
		rng?: () => number;
	} = $props();

	// rng снапшотится при создании компонента: ГПСЧ упражнения выбирается один
	// раз и не меняется в процессе игры (паттерн corsi).
	// svelte-ignore state_referenced_locally
	const session: SimonTrial[] = buildSession(rng);

	type Phase = 'block-intro' | 'stimulus' | 'feedback' | 'iti' | 'finished';

	let phase = $state<Phase>('block-intro');
	/** Индекс текущей пробы в session (0-базный). */
	let trialIdx = $state(0);
	/** Фраза фида зависит от исхода только что завершённой пробы. */
	let lastIsCorrect = $state(true);
	// Реальные значения фаз устанавливает startPhase() в onMount — до первой
	// отрисовки; константы здесь лишь безопасные заглушки типов (паттерн corsi).
	let phaseDuration = $state(RESPONSE_WINDOW_MS);
	let timeLeft = $state(RESPONSE_WINDOW_MS);

	// Аккумулятор результатов: пробы идут строго последовательно, поэтому
	// обычного массива достаточно; пересоздаётся вместе с компонентом.
	let results: SimonResult[] = [];
	let trialStart = 0;
	let deadline = 0;
	let phaseTimer: ReturnType<typeof setTimeout> | undefined;
	let progressTimer: ReturnType<typeof setInterval> | undefined;

	const currentTrial = $derived(session[trialIdx]);
	const currentBlock = $derived(currentTrial?.block ?? 1);
	/** Размер текущего блока: 5 / 10 / 20. */
	const blockSize = $derived(
		currentBlock === 1 ? BLOCK1_TRIALS : currentBlock === 2 ? BLOCK2_TRIALS : BLOCK3_TRIALS
	);
	/** Номер пробы внутри текущего блока, 1-базный (для счётчика «Часть X: N/M»). */
	const trialInBlock = $derived(
		currentTrial ? trialIdx - blockStartIndex(currentBlock) + 1 : 1
	);
	const completedTrials = $derived(Math.min(results.length, TOTAL_TRIALS));
	const isStimulus = $derived(phase === 'stimulus');
	const isBlock3 = $derived(currentBlock === 3);

	/** Кружок виден на протяжении всей пробы: stimulus + feedback (фид). */
	const showCircle = $derived(phase === 'stimulus' || phase === 'feedback');
	const phaseLabel = $derived.by(() => {
		switch (phase) {
			case 'block-intro':
				return 'Инструкция';
			case 'stimulus':
				return 'Отвечай по цвету';
			case 'feedback':
				return lastIsCorrect ? 'Верно' : 'Ошибка';
			case 'iti':
				return 'Приготовься';
			default:
				return '';
		}
	});
	// Бар под полем показывает истёкшую долю текущей фазы (паттерн corsi:
	// незакрашенный остаток = оставшееся время окна ответа).
	const elapsed = $derived(phaseDuration - timeLeft);

	const BLOCK_INTROS: Record<number, string> = {
		1: 'Нажимай кнопку под цвет кружка: красный — слева, синий — справа',
		2: 'Кружок появится слева или справа. Нажимай по ЦВЕТУ, не по месту: красный — слева, синий — справа',
		3: 'Теперь 4 цвета: красный — слева, синий — справа, зелёный — сверху, жёлтый — снизу'
	};

	/** Позиция центра кружка в % поля для каждой позиции стимула. */
	const POSITION_COORDS: Record<SimonPosition, { x: number; y: number }> = {
		center: { x: 50, y: 50 },
		left: { x: 27, y: 50 },
		right: { x: 73, y: 50 },
		up: { x: 50, y: 27 },
		down: { x: 50, y: 73 }
	};

	const BUTTONS_BLOCKS_12: { color: SimonColor; position: 'left' | 'right'; label: string; cls: string }[] = [
		{ color: 'red', position: 'left', label: 'Красный', cls: 'bg-red-500' },
		{ color: 'blue', position: 'right', label: 'Синий', cls: 'bg-blue-500' }
	];

	const BUTTONS_BLOCK_3: { color: SimonColor; position: 'up' | 'left' | 'right' | 'down'; label: string; cls: string }[] = [
		{ color: 'green', position: 'up', label: 'Зелёный', cls: 'bg-green-500' },
		{ color: 'red', position: 'left', label: 'Красный', cls: 'bg-red-500' },
		{ color: 'blue', position: 'right', label: 'Синий', cls: 'bg-blue-500' },
		{ color: 'yellow', position: 'down', label: 'Жёлтый', cls: 'bg-yellow-400' }
	];

	const CIRCLE_CLS: Record<SimonColor, string> = {
		red: 'bg-red-500',
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		yellow: 'bg-yellow-400'
	};

	/** Сквозной индекс первой пробы блока (0-базный). */
	function blockStartIndex(block: number): number {
		if (block <= 1) return 0;
		if (block === 2) return BLOCK1_TRIALS;
		return BLOCK1_TRIALS + BLOCK2_TRIALS;
	}

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

	/** Запускает таймеры текущей фазы: block-intro → stimulus → feedback → iti → … */
	function startPhase() {
		clearTimers();
		switch (phase) {
			case 'block-intro':
				phaseDuration = introMs;
				phaseTimer = setTimeout(beginTrial, introMs);
				break;
			case 'stimulus':
				phaseDuration = responseWindowMs;
				trialStart = performance.now();
				phaseTimer = setTimeout(timeoutTrial, responseWindowMs);
				break;
			case 'feedback':
				phaseDuration = feedbackMs;
				phaseTimer = setTimeout(proceedAfterFeedback, feedbackMs);
				break;
			case 'iti':
				phaseDuration = itiMs;
				phaseTimer = setTimeout(advance, itiMs);
				break;
		}
		deadline = performance.now() + phaseDuration;
		timeLeft = phaseDuration;
		progressTimer = setInterval(() => {
			timeLeft = Math.max(0, deadline - performance.now());
		}, 100);
	}

	function beginTrial() {
		phase = 'stimulus';
		startPhase();
	}

	/** Ответ по кнопке: валиден только в stimulus, иначе тихий no-op (паттерн corsi). */
	function answer(color: SimonColor) {
		if (!isStimulus || !currentTrial) return;
		finishTrial(evaluateTrial(currentTrial, color, performance.now() - trialStart, responseWindowMs));
	}

	function timeoutTrial() {
		if (!currentTrial) return;
		// Нетап тарифицируется как полный таймаут — движку пробрасываем windowMs.
		finishTrial(evaluateTrial(currentTrial, null, responseWindowMs, responseWindowMs));
	}

	function finishTrial(result: SimonResult) {
		results.push(result);
		lastIsCorrect = result.isCorrect;
		phase = 'feedback';
		startPhase();
	}

	function proceedAfterFeedback() {
		phase = 'iti';
		startPhase();
	}

	function advance() {
		if (trialIdx + 1 >= session.length) {
			finish();
			return;
		}
		trialIdx += 1;
		// Перед первым trial каждого блока — экран инструкции.
		phase = session[trialIdx].block !== session[trialIdx - 1].block ? 'block-intro' : 'stimulus';
		startPhase();
	}

	function finish() {
		clearTimers();
		phase = 'finished';
		sendResults?.({ results, meta: buildMeta() });
		gameEnd();
	}

	/**
	 * Единственная точка выхода из block-intro (и тап по кнопке, и Enter/Space).
	 * Guard по фазе гасит двойной ввод в одном кадре (fast tap + Enter):
	 * второй вызов уже видит phase 'stimulus' и тихо выходит, не перезапуская
	 * таймер окна ответа.
	 */
	function continueIntro() {
		if (phase !== 'block-intro') return;
		clearTimers();
		beginTrial();
	}

	/** Клавиатура: стрелки эквивалентны кнопкам. Up/Down активны только в блоке 3. */
	function handleKeydown(event: KeyboardEvent) {
		if (phase === 'block-intro' && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			continueIntro();
			return;
		}
		if (!isStimulus) return;
		const arrowToColor: Record<string, SimonColor> = {
			ArrowLeft: 'red',
			ArrowRight: 'blue',
			ArrowUp: 'green',
			ArrowDown: 'yellow'
		};
		const color = arrowToColor[event.key];
		if (!color) return;
		// В блоках1–2 только red/blue: вверх/вниз — тихий no-op.
		if (!isBlock3 && (color === 'green' || color === 'yellow')) return;
		event.preventDefault();
		answer(color);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex w-full max-w-md flex-col items-center gap-3">
	{#if phase !== 'finished'}
		<!-- Счётчик блока + общий прогресс сессии (35 проб — кружками было бы
		     слишком много, поэтому текст + бар). -->
		<div class="flex w-full flex-col items-center gap-2" aria-hidden="true">
			<p class="text-sm font-semibold text-slate-600" data-block-counter>
				Часть {currentBlock} из 3 · {trialInBlock}/{blockSize}
			</p>
			<ProgressBar min={0} max={TOTAL_TRIALS} progress={completedTrials} />
		</div>

		<!-- Фраза состояния над полем: режим фазы без счётчиков. -->
		<p
			class="phase-phrase text-xl font-semibold text-slate-600"
			aria-live="polite"
			data-phase={phase}
		>
			{phaseLabel}
		</p>
	{/if}

	<!-- Панель квадратная: left/top в % корректны по обеим осям; координаты
	     позиции — ЦЕНТР кружка, поэтому translate(-50%, -50%). -->
	<div
		class="relative flex aspect-square w-full touch-none items-center justify-center rounded-2xl bg-slate-100 select-none"
		data-phase={phase}
		aria-label="Игровое поле: кружок появляется на поле, ответьте кнопкой его цвета"
	>
		{#if phase === 'block-intro'}
			<!-- Экран инструкции блока: тап/Enter продолжают раньше таймера. -->
			<button
				type="button"
				class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-6 text-center"
				data-continue
				onclick={() => {
					continueIntro();
				}}
			>
				<span class="text-sm font-medium tracking-wide text-slate-400 uppercase">
					Часть {currentBlock} из 3
				</span>
				<span class="text-lg font-semibold text-slate-700 sm:text-xl">
					{BLOCK_INTROS[currentBlock]}
				</span>
				<span class="text-sm text-slate-400">Нажмите, чтобы продолжить</span>
			</button>
		{:else if showCircle && currentTrial}
			{@const coords = POSITION_COORDS[currentTrial.position]}
			{@const isFeedback = phase === 'feedback'}
			<div
				class="absolute aspect-square rounded-full transition-transform duration-150 {CIRCLE_CLS[currentTrial.color]} {isFeedback
					? lastIsCorrect
						? 'scale-110 ring-8 ring-green-300'
						: 'scale-95 ring-8 ring-red-300'
					: ''}"
				style="left: {coords.x}%; top: {coords.y}%; width: 20%; transform: translate(-50%, -50%);"
				data-circle
				data-color={currentTrial.color}
				data-position={currentTrial.position}
				aria-hidden="true"
			></div>
		{/if}
	</div>

	{#if phase !== 'finished' && phase !== 'block-intro'}
		<!-- Обратный отсчёт текущей фазы: в stimulus — окно ответа. -->
		<ProgressBar min={0} max={phaseDuration} progress={elapsed} />
	{/if}

	{#if phase !== 'finished'}
		<!-- Кнопки ответа: блоки 1–2 — два цвета, блок 3 — D-pad крестом.
		     Ввод валиден только в stimulus (тихий no-op иначе). -->
		{#if isBlock3}
			<div class="grid w-40 grid-cols-3 grid-rows-3 gap-2" data-dpad>
				{#each BUTTONS_BLOCK_3 as btn (btn.color)}
					{#if btn.position === 'up'}
						<button
							type="button"
							class="col-start-2 row-start-1 h-14 cursor-pointer rounded-xl {btn.cls} transition-transform duration-100 select-none hover:scale-105 {isStimulus ? '' : 'opacity-50'}"
							data-button={btn.color}
							data-button-position={btn.position}
							aria-label="Ответ: {btn.label}"
							onclick={() => answer(btn.color)}
						></button>
					{:else if btn.position === 'left'}
						<button
							type="button"
							class="col-start-1 row-start-2 h-14 cursor-pointer rounded-xl {btn.cls} transition-transform duration-100 select-none hover:scale-105 {isStimulus ? '' : 'opacity-50'}"
							data-button={btn.color}
							data-button-position={btn.position}
							aria-label="Ответ: {btn.label}"
							onclick={() => answer(btn.color)}
						></button>
					{:else if btn.position === 'right'}
						<button
							type="button"
							class="col-start-3 row-start-2 h-14 cursor-pointer rounded-xl {btn.cls} transition-transform duration-100 select-none hover:scale-105 {isStimulus ? '' : 'opacity-50'}"
							data-button={btn.color}
							data-button-position={btn.position}
							aria-label="Ответ: {btn.label}"
							onclick={() => answer(btn.color)}
						></button>
					{:else}
						<button
							type="button"
							class="col-start-2 row-start-3 h-14 cursor-pointer rounded-xl {btn.cls} transition-transform duration-100 select-none hover:scale-105 {isStimulus ? '' : 'opacity-50'}"
							data-button={btn.color}
							data-button-position={btn.position}
							aria-label="Ответ: {btn.label}"
							onclick={() => answer(btn.color)}
						></button>
					{/if}
				{/each}
			</div>
		{:else}
			<div class="flex w-full gap-4">
				{#each BUTTONS_BLOCKS_12 as btn (btn.color)}
					<button
						type="button"
						class="h-16 flex-1 cursor-pointer rounded-2xl {btn.cls} transition-transform duration-100 select-none hover:scale-105 {isStimulus ? '' : 'opacity-50'}"
						data-button={btn.color}
						data-button-position={btn.position}
						aria-label="Ответ: {btn.label}"
						onclick={() => answer(btn.color)}
					></button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
