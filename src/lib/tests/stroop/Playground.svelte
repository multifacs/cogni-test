<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { StroopGame } from './logic/stroop-game';
	import type { Color, Word, Stage } from './types';
	import { translate } from '$lib/utils/common';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

	let { gameEnd, sendResults } = $props();

	let currentWord: Word = $state('stage 1');
	let currentColor: Color | 'var(--main-text-color)' = $state('var(--main-text-color)');
	const DURATION = 5;
	let timeLeft = $state(DURATION);

	let isTestRunning = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;
	let game: StroopGame = $state(Object());

	const colors: Record<string, Color> = {
		Красный: 'red',
		Голубой: 'cyan',
		Синий: 'blue',
		Розовый: 'magenta',
		Зеленый: 'green',
		Желтый: 'yellow'
	};

	onMount(() => {
		resetGame();
	});

	export function resetGame() {
		game = new StroopGame();
		isTestRunning = true;
		nextTask();
	}

	export function stopGame() {
		isTestRunning = false;
		updateState('stage 1', 'var(--main-text-color)');
		clearTimer();
		gameEnd();
		sendResults(game.getResults());
	}

	function nextTask() {
		if (!isTestRunning || game.isGameOver()) return stopGame();
		game.startNextTask();
		const { word, color } = game.getCurrentTask();
		updateState(word, color);
		startTimer();
	}

	function updateState(word: Word, color: Color | 'var(--main-text-color)') {
		currentWord = word;
		currentColor = color;
		timeLeft = DURATION;
	}

	function startTimer() {
		clearTimer();
		timer = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				clearTimer();
				game.handleAnswer(null);
				nextTask();
			}
		}, 1000);
	}

	function clearTimer() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function handleAnswer(color: string) {
		if (!isTestRunning || currentColor === 'var(--main-text-color)') return;
		clearTimer();
		game.handleAnswer(color as Color);
		nextTask();
	}

	const stageInstructions: Record<Stage, string> = {
		'stage -1': '',
		'stage 1': 'Нажмите квадратик того же цвета, что и слово.',
		'stage 2': 'Нажмите квадратик цвета, который обозначает слово.',
		'stage 3': 'Нажмите квадратик цвета, которым написано слово.'
	};

	function checkWordStage(word: Word): Stage {
		if (word.includes('stage')) return word as Stage;
		return 'stage -1';
	}

	onDestroy(() => {
		clearTimer();
	});
</script>

{#if isTestRunning}
	<div class="flex h-[100dvh] w-full items-center justify-center overflow-hidden p-4">
		<div class="flex h-full max-h-full w-full max-w-lg flex-col items-center gap-3 sm:gap-4">
			<div class="w-full">
				<ProgressBar min={0} max={DURATION} progress={DURATION - timeLeft} />
			</div>

			<p class="text-center text-sm sm:text-base" style="opacity: 0.75;">
				{stageInstructions[checkWordStage(currentWord)]}
			</p>

			<div
				class="flex w-full max-w-xs items-center justify-center rounded-2xl border-2 px-4 py-3"
				style="border-color: var(--input-bg-color); background-color: #ffffff;"
			>
				<h1
					class="text-center font-bold"
					style="
						color: {currentColor};
						font-size: clamp(1.25rem, 4vh, 2rem);
						text-shadow:
							0 0 2px rgba(0, 0, 0, 0.35),
							0 0 1px rgba(0, 0, 0, 0.5);
					"
				>
					{translate(currentWord)}
				</h1>
			</div>

			<div
				class="grid w-full flex-1 grid-cols-2 content-center justify-items-center gap-4 sm:grid-cols-3 sm:gap-6"
			>
				{#each Object.values(colors) as color (color)}
					<button
						type="button"
						class="aspect-square w-[45%] cursor-pointer rounded-2xl border-none shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] sm:w-[65%]"
						style="background-color: {color};"
						aria-label={color}
						onclick={() => handleAnswer(color)}
					></button>
				{/each}
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-[100dvh] w-full items-center justify-center p-6">
		<div class="flex flex-col items-center gap-4">
			<svg
				class="h-16 w-16"
				style="color: var(--button-green);"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h1 class="text-center text-2xl font-bold">Тест окончен</h1>
			<p class="text-center text-base" style="opacity: 0.6;">Результаты отправлены</p>
		</div>
	</div>
{/if}
