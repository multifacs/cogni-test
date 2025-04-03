<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import Button from '$lib/components/button.svelte';

	import { StroopTestGame } from './stroop-game';
	import type { Color } from './stroop-game';
	import ResultsChart from './results-chart.svelte';
	import { translate } from './utils';

	import Chart from 'chart.js/auto';

	Chart.defaults.color = 'white';

	// Game state
	let currentWord = $state('stage 1');
	let currentColor = $state('');
	let score = 0;
	const DURATION = 3;
	let timeLeft = $state(DURATION);

	let isTestRunning = $state(false);
	let timer: number | null = null;
	let game: StroopTestGame = $state(Object());

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
		game = new StroopTestGame();
		score = 0;
		isTestRunning = true;
		nextWord();
	}

	function startTest() {
		resetGameState();
	}

	function stopTest() {
		isTestRunning = false;
		updateWordState('stage 1', '');
		clearTimer();
	}

	function nextWord() {
		if (!isTestRunning || game.isGameOver()) return endTest();

		game.startNextWord();
		const { word, color } = game.getCurrentTask();
		updateWordState(word, color);
		startTimer();
	}

	function updateWordState(word: string, color: string) {
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
				game.handleColorSelection(null);
				nextWord();
			}
		}, 1000);
	}

	function clearTimer() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function handleColorClick(color: string) {
		if (!isTestRunning || currentColor === 'white') return;
		clearTimer();

		game.handleColorSelection(color as Color);
		score = game.getResults().filter((x) => x.answer).length;
		nextWord();
	}

	let showResults = $state(false);

	function endTest() {
		isTestRunning = false;
		updateWordState('Конец', 'white');
		clearTimer();
		showResults = true;
	}
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
		<div class="color-text" style="color: {currentColor};">{translate(currentWord)}</div>
		<div class="color-grid">
			{#each Object.values(colors) as color}
				<button
					class="color-button"
					style="background-color: {color};"
					aria-label={color}
					onclick={() => handleColorClick(color)}
				></button>
			{/each}
		</div>
		<div>Осталось времени: {timeLeft} сек</div>
		<Button color="red" onclick={stopTest}>Стоп</Button>
	</div>
{/if}

{#if showResults}
	<ResultsChart results={game.getResults()}></ResultsChart>
{/if}

<style>
	h1 {
		color: #f8faff;
	}
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
		font-family: "Comic Sans MS", "Comic Sans", cursive;
		font-size: 2em;
		margin-bottom: 20px;
		-webkit-text-stroke-color: #5c70a3;
		-webkit-text-stroke: 1px;
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
