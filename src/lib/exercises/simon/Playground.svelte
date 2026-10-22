<script lang="ts">
	import { onDestroy } from 'svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import type { MetaResult } from '$lib/exercises/types';
	import {
		BLOCK_DURATIONS_MS,
		buildMeta,
		createTrialSource,
		evaluateTrial,
		FEEDBACK_MS
	} from './logic/engine';
	import type { SimonBlock, SimonColor, SimonPosition, SimonResult, SimonTrial } from './types';

	let {
		gameEnd,
		sendResults,
		blockDurationsMs = BLOCK_DURATIONS_MS,
		feedbackMs = FEEDBACK_MS,
		rng = Math.random
	}: {
		/** Локальный финальный экран (контракт страницы playground). */
		gameEnd: () => void;
		/** Сохранение результатов сессии (контракт страницы playground). */
		sendResults?: (payload: MetaResult) => void;
		/** Инъекция длительностей частей (тесты ускоряют). */
		blockDurationsMs?: Record<SimonBlock, number>;
		/** Инъекция длительности вспышки после ответа (тесты ускоряют). */
		feedbackMs?: number;
		/** Инъекция ГПСЧ: тесты передают детерминированный, прод — Math.random. */
		rng?: () => number;
	} = $props();

	// rng снапшотится при создании компонента: ГПСЧ упражнения выбирается один
	// раз и не меняется в процессе игры (паттерн corsi).
	// svelte-ignore state_referenced_locally
	const source = createTrialSource(rng);

	type Phase = 'block-intro' | 'stimulus' | 'feedback' | 'finished';

	let phase = $state<Phase>('block-intro');
	/** Номер текущей части: 1 → 2 → 3. */
	let block = $state<SimonBlock>(1);
	/** Проба, предъявленная в текущей фазе stimulus/feedback. */
	let currentTrial = $state<SimonTrial | null>(null);
	/** Фраза фида зависит от исхода только что завершённой пробы. */
	let lastIsCorrect = $state(true);
	/**
	 * Остаток времени текущей части, мс. Инициализируется дефолтной
	 * длительностью части 1; реальное значение выставляет startBlock()
	 * (важно для тестов с инъекцией коротких частей).
	 */
	let blockTimeLeft = $state(BLOCK_DURATIONS_MS[1]);

	// Аккумулятор результатов: пробы идут строго последовательно, поэтому
	// обычного массива достаточно; пересоздаётся вместе с компонентом.
	let results: SimonResult[] = [];
	let trialStart = 0;
	let blockDeadline = 0;
	let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
	let blockTimer: ReturnType<typeof setTimeout> | undefined;
	let tickTimer: ReturnType<typeof setInterval> | undefined;

	const blockDuration = $derived(blockDurationsMs[block] ?? BLOCK_DURATIONS_MS[block]);
	const secondsLeft = $derived(Math.max(0, Math.ceil(blockTimeLeft / 1000)));
	/** На интро показываем полную длительность части, а не остаток. */
	const displayedSeconds = $derived(
		phase === 'block-intro' ? Math.round(blockDuration / 1000) : secondsLeft
	);
	// Бар под счётчиком показывает истёкшую долю текущей части; clamp
	// защищает от отрицательного прогресса до первого startBlock().
	const elapsed = $derived(Math.max(0, Math.min(blockDuration, blockDuration - blockTimeLeft)));
	const isStimulus = $derived(phase === 'stimulus');
	const showCircle = $derived(phase === 'stimulus' || phase === 'feedback');

	const phaseLabel = $derived.by(() => {
		switch (phase) {
			case 'block-intro':
				return 'Инструкция';
			case 'stimulus':
				return 'Отвечай стрелкой по цвету';
			case 'feedback':
				return lastIsCorrect ? 'Верно' : 'Ошибка';
			default:
				return '';
		}
	});

	const BLOCK_INTROS: Record<SimonBlock, string> = {
		1: 'Нажимайте стрелку, соответствующую цвету кружка.',
		2: 'Кружок может появиться слева или справа. Отвечайте по ЦВЕТУ, а не по месту.',
		3: 'Четыре цвета — четыре стрелки. Отвечайте по цвету, а не по позиции кружка.'
	};

	/** Памятка «цвет → стрелка» на экране инструкции части. */
	const LEGEND: Record<SimonBlock, { color: SimonColor; arrow: string }[]> = {
		1: [
			{ color: 'red', arrow: '←' },
			{ color: 'blue', arrow: '→' }
		],
		2: [
			{ color: 'red', arrow: '←' },
			{ color: 'blue', arrow: '→' }
		],
		3: [
			{ color: 'red', arrow: '←' },
			{ color: 'blue', arrow: '→' },
			{ color: 'green', arrow: '↑' },
			{ color: 'yellow', arrow: '↓' }
		]
	};

	/** Позиция центра кружка в % поля для каждой позиции стимула. */
	const POSITION_COORDS: Record<SimonPosition, { x: number; y: number }> = {
		center: { x: 50, y: 50 },
		left: { x: 27, y: 50 },
		right: { x: 73, y: 50 },
		up: { x: 50, y: 27 },
		down: { x: 50, y: 73 }
	};

	const DOT_CLS: Record<SimonColor, string> = {
		red: 'bg-red-500',
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		yellow: 'bg-yellow-400'
	};

	const CIRCLE_CLS: Record<SimonColor, string> = {
		red: 'bg-red-500',
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		yellow: 'bg-yellow-400'
	};

	const ANSWER_BTN_CLS =
		'cursor-pointer rounded-xl bg-slate-200 font-semibold text-slate-700 transition-transform duration-100 select-none hover:scale-105 hover:bg-slate-300';

	const BUTTONS_BLOCKS_12: {
		color: 'red' | 'blue';
		position: 'left' | 'right';
		arrow: string;
		label: string;
	}[] = [
		{ color: 'red', position: 'left', arrow: '←', label: 'влево' },
		{ color: 'blue', position: 'right', arrow: '→', label: 'вправо' }
	];

	const BUTTONS_BLOCK_3: {
		color: SimonColor;
		position: 'up' | 'left' | 'right' | 'down';
		arrow: string;
		label: string;
	}[] = [
		{ color: 'green', position: 'up', arrow: '↑', label: 'вверх' },
		{ color: 'red', position: 'left', arrow: '←', label: 'влево' },
		{ color: 'blue', position: 'right', arrow: '→', label: 'вправо' },
		{ color: 'yellow', position: 'down', arrow: '↓', label: 'вниз' }
	];

	/** Ячейка D-pad для стрелки части 3. */
	function dpadCell(position: 'up' | 'left' | 'right' | 'down'): string {
		switch (position) {
			case 'up':
				return 'col-start-2 row-start-1';
			case 'left':
				return 'col-start-1 row-start-2';
			case 'right':
				return 'col-start-3 row-start-2';
			default:
				return 'col-start-2 row-start-3';
		}
	}

	onDestroy(() => {
		clearTimers();
	});

	function clearTimers() {
		clearTimeout(feedbackTimer);
		clearTimeout(blockTimer);
		clearInterval(tickTimer);
	}

	/** Старт части: общий таймер части + первая проба. */
	function startBlock() {
		clearTimers();
		blockDeadline = performance.now() + blockDuration;
		blockTimeLeft = blockDuration;
		blockTimer = setTimeout(endBlock, blockDuration);
		tickTimer = setInterval(() => {
			blockTimeLeft = Math.max(0, blockDeadline - performance.now());
		}, 100);
		nextTrial();
	}

	/**
	 * Следующая проба. Если время части уже вышло (например, фидбек
	 * закончился ровно на границе), часть закрывается без предъявления.
	 */
	function nextTrial() {
		clearTimeout(feedbackTimer);
		if (performance.now() >= blockDeadline) {
			endBlock();
			return;
		}
		currentTrial = source.next(block);
		trialStart = performance.now();
		phase = 'stimulus';
	}

	/** Ответ стрелкой: валиден только в stimulus, иначе тихий no-op. */
	function answer(color: SimonColor) {
		if (!isStimulus || !currentTrial) return;
		const result = evaluateTrial(
			currentTrial,
			color,
			performance.now() - trialStart,
			results.length + 1
		);
		results.push(result);
		lastIsCorrect = result.isCorrect;
		phase = 'feedback';
		feedbackTimer = setTimeout(nextTrial, feedbackMs);
	}

	/**
	 * Конец части по таймеру. Неотвеченная проба на границе не сохраняется:
	 * результаты фиксируют только завершённые ответы. После частей 1–2 —
	 * экран инструкции следующей части (таймер стоит), после части 3 — финиш.
	 */
	function endBlock() {
		clearTimers();
		currentTrial = null;
		if (block < 3) {
			block = (block + 1) as SimonBlock;
			blockTimeLeft = blockDuration;
			phase = 'block-intro';
			return;
		}
		finish();
	}

	function finish() {
		clearTimers();
		currentTrial = null;
		phase = 'finished';
		sendResults?.({ results, meta: buildMeta() });
		gameEnd();
	}

	/**
	 * Единственная точка выхода из block-intro (и тап, и Enter/Space).
	 * Guard по фазе гасит двойной ввод в одном кадре.
	 */
	function continueIntro() {
		if (phase !== 'block-intro') return;
		startBlock();
	}

	/** Клавиатура: стрелки эквивалентны кнопкам. Up/Down активны только в части 3. */
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
		// В частях 1–2 только red/blue: вверх/вниз — тихий no-op.
		if (block !== 3 && (color === 'green' || color === 'yellow')) return;
		event.preventDefault();
		answer(color);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex w-full max-w-md flex-col items-center gap-3">
	{#if phase !== 'finished'}
		<!-- Счётчик части + таймер части. Прогресс-бар показывает истёкшую
		     долю времени части (как таймер в «Ласточке»). -->
		<div class="flex w-full flex-col items-center gap-2" aria-hidden="true">
			<p class="text-sm font-semibold text-slate-600" data-block-counter>
				Часть {block} из 3 · ⏱ {displayedSeconds} с
			</p>
			<ProgressBar min={0} max={blockDuration} progress={elapsed} />
		</div>

		<!-- Фраза состояния над полем: режим фазы без счётчиков. -->
		<p class="phase-phrase text-xl font-semibold text-slate-600" aria-live="polite">
			{phaseLabel}
		</p>
	{/if}

	<!-- Панель квадратная: left/top в % корректны по обеим осям; координаты
	     позиции — ЦЕНТР кружка, поэтому translate(-50%, -50%). -->
	<div
		class="relative flex aspect-square w-full touch-none items-center justify-center rounded-2xl bg-slate-100 select-none"
		data-phase={phase}
		data-block={block}
		aria-label="Игровое поле: цветной кружок, отвечайте стрелкой по цвету"
	>
		{#if phase === 'block-intro'}
			<!-- Экран инструкции части: тап/Enter начинают часть. -->
			<button
				type="button"
				class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-6 text-center"
				data-continue
				onclick={() => {
					continueIntro();
				}}
			>
				<span class="text-sm font-medium tracking-wide text-slate-400 uppercase">
					Часть {block} из 3 · {Math.round(blockDuration / 1000)} секунд
				</span>
				<span class="max-w-xs text-lg font-semibold text-slate-700 sm:text-xl">
					{BLOCK_INTROS[block]}
				</span>
				<span class="text-sm text-slate-400">Запомните соответствие:</span>
				<span class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
					{#each LEGEND[block] as item (item.color)}
						<span
							class="inline-flex items-center gap-1 text-lg font-semibold text-slate-700"
						>
							<span
								class="inline-block h-4 w-4 rounded-full {DOT_CLS[item.color]}"
								aria-hidden="true"
							></span>
							{item.arrow}
						</span>
					{/each}
				</span>
				<span
					class="mt-1 inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2.5 text-base font-semibold text-white shadow-lg ring-2 ring-slate-400/40"
				>
					Нажмите, чтобы начать
				</span>
			</button>
		{:else if showCircle && currentTrial}
			{@const coords = POSITION_COORDS[currentTrial.position]}
			{@const isFeedback = phase === 'feedback'}
			<div
				class="absolute aspect-square rounded-full transition-transform duration-150 {CIRCLE_CLS[
					currentTrial.color
				]} {isFeedback
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

	{#if phase !== 'finished'}
		<!-- Кнопки ответа — только стрелки, без цветовой подсказки: цвет
		     нужно перевести в направление по памятке из инструкции.
		     Ввод валиден только в stimulus (тихий no-op иначе). -->
		{#if block === 3}
			<div class="grid w-52 grid-cols-3 grid-rows-3 gap-2" data-dpad>
				{#each BUTTONS_BLOCK_3 as btn (btn.color)}
					<button
						type="button"
						class="{dpadCell(
							btn.position
						)} h-16 w-full text-2xl {ANSWER_BTN_CLS} {isStimulus ? '' : 'opacity-50'}"
						data-button={btn.color}
						data-button-position={btn.position}
						data-arrow={btn.position}
						aria-label="Ответ: {btn.label}"
						onclick={() => answer(btn.color)}
					>
						{btn.arrow}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex w-full gap-4">
				{#each BUTTONS_BLOCKS_12 as btn (btn.color)}
					<button
						type="button"
						class="h-16 flex-1 text-3xl {ANSWER_BTN_CLS} {isStimulus
							? ''
							: 'opacity-50'}"
						data-button={btn.color}
						data-button-position={btn.position}
						data-arrow={btn.position}
						aria-label="Ответ: {btn.label}"
						onclick={() => answer(btn.color)}
					>
						{btn.arrow}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
