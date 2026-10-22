<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { NumericStroopGame } from './logic/numeric-stroop-game';
	import type {
		NumericStroopBackground,
		NumericStroopResult,
		NumericStroopTask,
		Side
	} from './types';

	// Background colour is the rule cue: yellow — font size, green — value.
	const BACKGROUND_COLORS: Record<NumericStroopBackground, string> = {
		yellow: 'var(--camp-light-yellow)',
		green: 'var(--button-green)'
	};

	// game / durationMs инжектятся только из тестов — контракт для
	// реальных страниц не меняется (Task 1.3 монтирует без них).
	// Если game не инжектирован, resetGame() пересоздаёт его (свежие результаты при рестарте).
	let {
		gameEnd,
		sendResults,
		game: injectedGame,
		durationMs = 60_000
	}: {
		gameEnd: () => void;
		sendResults: (results: NumericStroopResult[]) => void;
		game?: NumericStroopGame;
		durationMs?: number;
	} = $props();

	// Захватываем начальное значение инъекции осознанно (один раз при создании) —
	// поэтому untrack: без него Svelte предупреждает state_referenced_locally.
	let game = untrack(() => injectedGame ?? new NumericStroopGame());

	let currentTask = $state<NumericStroopTask>({
		left: { value: 0, size: 'small' },
		right: { value: 0, size: 'small' },
		background: 'yellow',
		correctAnswer: 'left',
		congruent: true
	});
	let timeLeft = $state(0);
	let isGameOver = $state(false);

	let timer: ReturnType<typeof setInterval> | undefined;
	let endTime = 0;

	onMount(() => {
		resetGame();
	});

	export function resetGame() {
		clearInterval(timer);
		if (!injectedGame) {
			game = new NumericStroopGame();
		}
		isGameOver = false;

		currentTask = game.getCurrentTask();
		game.startNextTask();

		endTime = Date.now() + durationMs;
		timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
		timer = setInterval(() => {
			timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
			if (timeLeft <= 0) {
				stopGame();
			}
		}, 1000);
	}

	function handleAnswer(answer: Side) {
		game.handleAnswer(answer);
		currentTask = game.getCurrentTask();
		game.startNextTask();
	}

	export function stopGame() {
		clearInterval(timer);
		isGameOver = true;
		gameEnd();
		sendResults(game.getResults());
	}

	onDestroy(() => {
		clearInterval(timer);
	});
</script>

<div class="top-bar flex items-center justify-center">
	<div class="timer">⏱ {timeLeft} сек</div>
</div>

<h2 class="text-center">
	{currentTask.background === 'yellow'
		? 'Какое число больше по размеру?'
		: 'Какое число больше по значению?'}
</h2>

<div
	class="stimulus-panel flex items-baseline justify-center gap-16 rounded-2xl px-12 py-6"
	data-rule={currentTask.background}
	style="background-color: {BACKGROUND_COLORS[currentTask.background]};"
>
	<span class="number" style="font-size: {currentTask.left.size === 'big' ? '6rem' : '3rem'};"
		>{currentTask.left.value}</span
	>
	<span class="number" style="font-size: {currentTask.right.size === 'big' ? '6rem' : '3rem'};"
		>{currentTask.right.value}</span
	>
</div>

<div class="controls grid grid-cols-2 gap-4">
	<Button color="blue" disabled={isGameOver} onclick={() => handleAnswer('left')}>Слева</Button>
	<Button color="blue" disabled={isGameOver} onclick={() => handleAnswer('right')}>Справа</Button>
</div>

<style>
	.timer {
		font-size: 1.2rem;
	}

	.number {
		line-height: 1;
		user-select: none;
	}
</style>
