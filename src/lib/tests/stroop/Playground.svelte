<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { StroopGame } from './logic/stroop-game';
	import type { Color, Word, Stage } from './types';
	import { translate } from '$lib/utils/common';

	let { gameEnd, sendResults } = $props();

	// Game state
	let currentWord: Word = $state('stage 1');
	let currentColor: Color | 'var(--main-text-color)' = $state('var(--main-text-color)');
	let score = 0;
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
		score = 0;
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
		score = game.getResults().filter((x) => x.isCorrect).length;
		nextTask();
	}

	type instructionsObject = {
		[key in Stage]: string;
	};
	const stageInstructions: instructionsObject = {
		'stage -1': 'Ошибка',
		'stage 1':
			'Слово написано тем же цветом, что и означает. Нажмите на квадратик такого же цвета.',
		'stage 2':
			'Слово написано другим цветом. Нажимайте на квадратик того цвета, который обозначает слово (по смыслу).',
		'stage 3':
			'Слово снова написано не своим цветом. Теперь нажимайте на квадратик того цвета, которым написано слово (не обращайте внимания на смысл).'
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
		<h1 class="text-center" style="color: {currentColor};">{translate(currentWord)}</h1>
		{#if currentWord.includes('stage')}
			<p class="text-center sm:text-xl">{stageInstructions[checkWordStage(currentWord)]}</p>
		{/if}
	{:else}
		<h1 class="text-center">Конец теста</h1>
	{/if}
</div>
<div class="grid grid-cols-[1fr_1fr] gap-4">
	{#each Object.values(colors) as color (color)}
		<button
			class="max-xs:w-16 max-xs:h-12 h-16 w-20 cursor-pointer border-none"
			style="background-color: {color};"
			aria-label={color}
			onclick={() => handleAnswer(color)}
		></button>
	{/each}
</div>
{#if isTestRunning}
	<p class="sm:text-xl">Осталось времени: {timeLeft} сек</p>
{/if}
