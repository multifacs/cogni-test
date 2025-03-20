<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { StroopTestGame } from './munsterbergTestGame'; // Adjust the import path as needed

	// Game state
	let currentWord: string = 'Этап 1';
	let currentColor = '';
	let score = 0;
	let timeLeft = 3;
	let isTestRunning = false;
	let timer: number | null = null;

	// Game logic
	let game: StroopTestGame;

	// Colors and stages
	const colors = {
		Красный: 'red',
		Бирюзовый: 'cyan',
		Синий: 'green',
		Пурпурный: 'magenta',
		Зеленый: 'blue',
		Желтый: 'yellow'
	};

	// Initialize the game
	onMount(() => {
		game = new StroopTestGame();
	});

	// Start the test
	async function startTest() {
		isTestRunning = true;
		score = 0;
		nextWord();
	}

	// Move to the next word
	async function nextWord() {
		if (!isTestRunning) return;

		// Check if the game is over
		if (game.isGameOver()) {
			endTest();
			return;
		}

		// Start the next word in the game logic
		game.startNextWord();
		const currentTask = game.getCurrentWord();
		console.log(currentTask);

		// Update UI state
		currentWord = currentTask.word;
		currentColor = currentTask.color;
		timeLeft = 3;

		// Start the 3-second timer
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				clearInterval(timer);
				game.handleColorSelection(null); // Handle timeout (incorrect answer)
				nextWord(); // Move to the next word
			}
		}, 1000);
	}

	// Handle color selection
	function handleColorClick(color: string) {
		if (!isTestRunning) return;
		if (currentColor == 'white') return;
		// Stop the timer
		if (timer) clearInterval(timer);

		// Handle the player's selection in the game logic
		game.handleColorSelection(color as Color);

		// Update the score
		const results = game.getResults();
		score = results.correctAnswers.filter((correct) => correct).length;

		// Move to the next word
		nextWord();
	}

	// End the test
	function endTest() {
		isTestRunning = false;
		currentWord = 'Конец';
		currentColor = 'white';
		if (timer) clearInterval(timer);

		// Log the results
		const results = game.getResults();
		console.log('Reaction Times:', results.reactionTimes);
		console.log('Correct Answers:', results.correctAnswers);
	}
</script>

<h1>Тест Струпа</h1>
{#if !isTestRunning}
	<p class="text">
		На экране появляются слова, обозначающие цвет. Ниже отображаются все возможные цветовые образцы.
		Нужно нажимать на цветовой образец в соответствии с заданием.
	</p>
	<p class="text">
		На первом этапе слово написано цветом, соответствующим смыслу слова. Нужно нажать на цветовой
		образец, <b>соответствующий и цвету, и смыслу слова</b>.
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
	<button onclick={startTest}>Начать тест</button>
	<a href="/tests">Назад</a>
	
{:else}
	<div class="subcontainer" transition:slide={{ duration: 500 }}>
		<div class="color-text" style="color: {currentColor};">{currentWord}</div>
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
		<div>Счет: {score}</div>
	</div>
{/if}

{#if !isTestRunning && score > 0}
	<div>Тест завершен! Ваш счет: {score}</div>
{/if}

<style>
	h1 {
		color: #f8faff;
	}
	.text {
		text-align: justify;
		margin: 10px 20px;
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
		font-weight: bold;
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

	@media (max-width: 600px) {
		.color-text {
			font-size: 1.5em;
		}
		.color-button {
			padding: 8px 16px;
		}
	}
</style>
