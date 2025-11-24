<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { StroopGame } from './logic/stroop-game';
	import type { Color, Word, Stage } from './types';
	import { translate } from '$lib/utils/common';

	let { gameEnd, sendResults } = $props();

	// Game state
	let currentWord: Word = $state('stage 1');
	let currentColor: Color | 'white' = $state('white');
	let score = 0;
	const DURATION = 3;
	let timeLeft = $state(DURATION);

	let isTestRunning = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;
	let game: StroopGame = $state(Object());

	const colors: Record<string, Color> = {
		Красный: 'red',
		Бирюзовый: 'cyan',
		Синий: 'blue',
		Пурпурный: 'magenta',
		Зеленый: 'green',
		Желтый: 'yellow'
	};

	onMount(() => {
		resetGame();
	});

	export function resetGame() {
		game = new StroopGame();
		score = 0;
		isTestRunning = true;
		nextTask();
	}

	export function stopGame() {
		isTestRunning = false;
		updateState('stage 1', 'white');
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

	function updateState(word: Word, color: Color | 'white') {
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
		if (!isTestRunning || currentColor === 'white') return;
		clearTimer();

		game.handleAnswer(color as Color);
		score = game.getResults().filter((x) => x.isCorrect).length;
		nextTask();
	}

	type instructionsObject = {
		[key in Stage]: string;
	};
	const stageInstructions: instructionsObject = {
		'stage -1': 'Ошибка',
		'stage 1': 'Нужно соответствовать и цвету, и смыслу.',
		'stage 2': 'Нужно соответствовать смыслу.',
		'stage 3': 'Нужно соответствовать цвету.'
	};

	function checkWordStage(word: Word): Stage {
		if (word.includes('stage')) {
			return word as Stage;
		}
		return 'stage -1';
	}

	onDestroy(() => {
		clearTimer();
	});
</script>

<div class="color-text flex h-20 flex-col items-center justify-center">
	{#if isTestRunning}
		<h1 style="color: {currentColor};" class="max-xs:hidden text-sm">{translate(currentWord)}</h1>
		<h2 style="color: {currentColor};" class="xs:hidden text-xl">{translate(currentWord)}</h2>
		{#if currentWord.includes('stage')}
			<p class="text-center">{stageInstructions[checkWordStage(currentWord)]}</p>
		{/if}
	{:else}
		<h1>Конец теста</h1>
	{/if}
</div>
<div class="grid gap-4 grid-cols-[1fr_1fr]">
	{#each Object.values(colors) as color}
		<button
			class="w-20 max-xs:w-16 h-16 max-xs:h-12 cursor-pointer border-none"
			style="background-color: {color};"
			aria-label={color}
			onclick={() => handleAnswer(color)}
		></button>
	{/each}
</div>
{#if isTestRunning}
	<div>Осталось времени: {timeLeft} сек</div>
{/if}

<style>
	.color-button {
		padding: 10px 20px;
		margin: 5px;
		width: 80px;
		height: 60px;
		border: none;
		cursor: pointer;
	}
</style>
