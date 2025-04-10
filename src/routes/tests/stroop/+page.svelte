<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import Button from '$lib/components/button.svelte';

	import { StroopGame } from './stroop-game';
	import type { Color } from './stroop-game';
	import ResultsChart from '$lib/components/results-chart/results-chart.svelte';
	import { translate } from '$lib/components/translate';

	import Chart from 'chart.js/auto';

	Chart.defaults.color = 'white';

	// Game state
	let currentWord = $state('stage 1');
	let currentColor = $state('');
	let score = 0;
	const DURATION = 3;
	let timeLeft = $state(DURATION);

	let isTestRunning = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;
	let game: StroopGame = $state(Object());

	const colors = {
		Красный: 'red',
		Бирюзовый: 'cyan',
		Синий: 'blue',
		Пурпурный: 'magenta',
		Зеленый: 'green',
		Желтый: 'yellow'
	};

	onMount(() => {});

	function resetGameState() {
		showResults = false;
		game = new StroopGame();
		score = 0;
		isTestRunning = true;
		nextTask();
	}

	function startTest() {
		resetGameState();
	}

	function stopTest() {
		isTestRunning = false;
		updateState('stage 1', '');
		clearTimer();
	}

	function nextTask() {
		if (!isTestRunning || game.isGameOver()) return endTest();

		game.startNextTask();
		const { word, color } = game.getCurrentTask();
		updateState(word, color);
		startTimer();
	}

	function updateState(word: string, color: string) {
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

	let showResults = $state(false);

	function endTest() {
		isTestRunning = false;
		updateState('Конец', 'white');
		clearTimer();
		showResults = true;
	}

	type stages = 'stage 1' | 'stage 2' | 'stage 3';
	type instructionsObject = {
		[key in stages]: string;
	};
	const stageInstructions: instructionsObject = {
		'stage 1': 'Нужно соответствовать и цвету, и смыслу.',
		'stage 2': 'Нужно соответствовать смыслу.',
		'stage 3': 'Нужно соответствовать и цвету.'
	};
</script>

<h1>Тест Струпа</h1>
{#if !isTestRunning}
	<div class="more-text">
		<p class="text">
			На экране появляются слова, обозначающие цвет. Ниже отображаются все возможные цветовые
			образцы. Нужно нажимать на цветовой образец в соответствии с заданием.
		</p>
		<details>
			<summary></summary>
			<p class="text">
				На первом этапе слово написано цветом, соответствующим смыслу слова. Нужно нажать на
				цветовой образец,
				<b>соответствующий и цвету, и смыслу слова</b>.
			</p>
			<p class="text">
				На втором этапе цвет и смысл слова разные. Нужно нажать на цветовой образец, <b
					>соответствующий смыслу слова</b
				>.
			</p>
			<p class="text">
				На третьем этапе также цвет и смысл разные. Нужно нажать на цветовой образец, <b
					>соответствующий цвету букв</b
				>.
			</p>
		</details>
	</div>
	<div class="button-container">
		<Button color="green" onclick={startTest}>Начать тест</Button>
		<Button
			color="red"
			onclick={() => {
				goto('/tests');
			}}>Назад</Button
		>
	</div>
{:else}
	<div class="subcontainer">
		<div class="color-text flex h-20 flex-col items-center justify-center">
			<h1 style="color: {currentColor};">{translate(currentWord)}</h1>
			{#if currentWord.includes('stage')}
				<p>{stageInstructions[currentWord]}</p>
			{/if}
		</div>
		<div class="color-grid">
			{#each Object.values(colors) as color}
				<button
					class="color-button"
					style="background-color: {color};"
					aria-label={color}
					onclick={() => handleAnswer(color)}
				></button>
			{/each}
		</div>
		<div>Осталось времени: {timeLeft} сек</div>
		<Button color="red" onclick={stopTest}>Стоп</Button>
	</div>
{/if}

{#if showResults}
	<ResultsChart stages={3} results={game.getResults()} xtitle="Нажатие" ytitle="Время реакции (мс)"
	></ResultsChart>
{/if}

<style>
	.text {
		text-align: justify;
	}
	.color-button {
		padding: 10px 20px;
		margin: 5px;
		width: 80px;
		height: 60px;
		border: none;
		cursor: pointer;
	}
	.color-text {
		/* font-family: 'Comic Neue'; */
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.color-text h1 {
		font-size: 24pt;
		-webkit-text-stroke-color: #5c70a3;
		-webkit-text-stroke: 1px;
	}
	.color-text p {
		font-size: 12pt;
	}

	.subcontainer {
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */
		gap: 20px;
	}

	.color-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.button-container {
		display: flex;
		gap: 10px; /* Расстояние между кнопками */
		justify-content: center; /* Выравнивание по центру */
		align-items: center; /* Выравнивание по вертикали */
	}

	@media (max-width: 600px) {
		.color-text {
			font-size: 1.5em;
		}
		.color-button {
			padding: 8px 16px;
		}
	}

	[open] summary {
		position: absolute;
		bottom: -1.5em;
		left: 0;
	}

	summary {
		margin-left: 20px;
	}

	summary::before {
		content: '...Больше';
	}

	[open] summary::before {
		content: 'Скрыть';
	}

	details {
		display: inline;
	}

	.more-text {
		position: relative;
		margin-bottom: 2em;
	}
</style>
