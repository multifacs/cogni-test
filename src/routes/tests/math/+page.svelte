<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { MathTestGame } from './mathTestGame'; // Adjust the import path as needed

	import Chart from 'chart.js/auto';

	// Game state
	let currentLeft: string = 'Начало';
	let currentRight: string = '';
	let currentSign: string = '';
	let score = 0;
	let timeLeft = 3;
	let isTestRunning = false;
	let timer: number | null = null;

	// Game logic
	let game: MathTestGame;

	let chart: HTMLElement | null;
	// Initialize the game
	onMount(() => {
		game = new MathTestGame();
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
		game.startNextTask();
		const currentTask = game.getCurrentTask();
		console.log(currentTask);

		// Update UI state
		currentLeft = currentTask.left;
		currentRight = currentTask.right;
		currentSign = currentTask.sign;
		timeLeft = 3;

		// Start the 3-second timer
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				clearInterval(timer);
				game.handleSelection(null); // Handle timeout (incorrect answer)
				nextWord(); // Move to the next word
			}
		}, 1000);
	}

	// Handle color selection
	function handleColorClick(answer: boolean) {
		if (!isTestRunning) return;
		if (currentLeft == 'stage') return;
		// Stop the timer
		if (timer) clearInterval(timer);

		// Handle the player's selection in the game logic
		game.handleSelection(answer);

		// Update the score
		const results = game.getResults();
		score = results.correctAnswers.filter((correct) => correct).length;

		// Move to the next word
		nextWord();
	}

	// End the test
	function endTest() {
		isTestRunning = false;
		currentLeft = 'Конец';
		currentRight = 'теста';
		if (timer) clearInterval(timer);

		// Log the results
		const results = game.getResults();
		console.log('Reaction Times:', results.reactionTimes);
		console.log('Correct Answers:', results.correctAnswers);

		(async function () {
			new Chart(chart, {
				type: 'line',
				data: {
					labels: Array.from({length: 10}, (_, i) => i + 1),
					datasets: [
						{
							label: 'Скорость ответа (мс)',
							data: results.reactionTimes,
							borderColor: 'rgb(100, 100, 100)',
							borderWidth: 2,
							pointBackgroundColor: (context) => {
								// Цвет точек также зависит от correct
								const index = context.dataIndex;
								return results.correctAnswers[index] ? 'rgb(95, 212, 107)' : 'rgb(204, 66, 51)';
							},
							pointRadius: 5, // Размер точек
							tension: 0.4 // Сглаживание линии
						}
					]
				},
				options: {
					responsive: true,
					plugins: {
    					colors: {
							enabled: true
    					}
  					},
				}
			});
		})();
	}
</script>

<h1>Арифметический тест</h1>
{#if !isTestRunning}
	<p class="text">
		Экран разделен пополам на 2 части: слева находится красное поле (НЕТ), справа – зеленое (ДА). По
		середине показывается числовое равенство. Необходимо нажать на красное поле, если числовое
		равенство неверное или на зеленое, если верно.
	</p>
	<p class="text">
		Всего 10 числовых равенств, на определение правильности каждого дается 3 секунды.
	</p>
	<button onclick={startTest}>Начать тест</button>
	<a href="/tests">Назад</a>
{:else}
	<div class="subcontainer" transition:slide={{ duration: 500 }}>
		<div class="inequality">
			<div class="left">
				<span>{currentLeft}</span>
			</div>
			<div class="sign">
				<span>{currentSign}</span>
			</div>
			<div class="right">
				<span>{currentRight}</span>
			</div>
		</div>
		<div class="color-grid">
			<button class="color-button yes" aria-label="yes" onclick={() => handleColorClick(true)}
				>ДА</button
			>
			<button class="color-button no" aria-label="no" onclick={() => handleColorClick(false)}
				>НЕТ</button
			>
		</div>
		<div>Осталось времени: {timeLeft} сек</div>
		<div>Счет: {score}</div>
	</div>
{/if}

{#if !isTestRunning && score > 0}
	<div>Тест завершен! Ваш счет: {score}</div>
{/if}

<canvas bind:this={chart}></canvas>

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

	.yes {
		background-color: green;
	}

	.no {
		background-color: red;
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

	.inequality {
		display: flex;
		justify-content: center;
		gap: 20px;
		font-size: large;
	}

	@media (max-width: 600px) {
		.color-button {
			padding: 8px 16px;
		}
	}
</style>
