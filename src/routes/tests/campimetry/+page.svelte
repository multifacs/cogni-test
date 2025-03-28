<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { CampimetryGame } from './campimetry-game';
	import type { Silhouette } from './campimetry-game';
	import { LabColor } from './lab-color.svelte';
	import { error } from '@sveltejs/kit';
	import { shuffle } from '$lib';

	import Chart from 'chart.js/auto';
	let { data } = $props();

	let isTestRunning = $state(false);
	let isHome = $state(true);
	let image = $state(Object());

	let timeLeft = $state(3);
	let timer: any = $state(null);

	let game: CampimetryGame = $state(Object());
	let silhouettes: string[] = $state([]);
	let currentAnswer = $state('');
	let currentBackgroundColor: LabColor = $state(Object());
	let currentSilhouetteColor: LabColor = $state(Object());
	let currentChannel = $state('');
	let currentOp = $state('');

	onMount(async () => {
		console.log(Object.keys(data.silhouettes));
		game = new CampimetryGame(Object.keys(data.silhouettes));
	});

	let chart: HTMLElement = $state(Object());

	async function startTest() {
		isTestRunning = true;
		isHome = false;
		nextTask();
	}

	function getSilhouetteChoices(num: number, correct: string): string[] {
		if (Object.keys(data.silhouettes).indexOf(correct) == -1) {
			error(500, 'Silhouette not in array');
		}
		let choices = Object.keys(data.silhouettes).filter((x) => x != correct);
		choices = choices.slice(0, num);
		choices.push(correct);
		shuffle(choices);
		return choices;
	}

	// Move to the next word
	async function nextTask() {
		if (!isTestRunning) return;

		// Check if the game is over
		if (game.isGameOver()) {
			endTest();
			return;
		}

		// Start the next word in the game logic
		game.startNextTask();
		const currentTask = game.getCurrentTask();
		currentAnswer = currentTask.answer;
		console.log(currentTask);

		// Update UI state

		if (currentAnswer.includes('stage')) {
			timeLeft = 3;
			// Start the 3-second timer
			if (timer) clearInterval(timer);
			timer = setInterval(() => {
				timeLeft -= 1;
				if (timeLeft <= 0) {
					clearInterval(timer);
					game.handleAnswer(); // Handle timeout (incorrect answer)
					nextTask(); // Move to the next word
				}
			}, 1000);
		} else if (
			currentTask.backgroundColor &&
			currentTask.silhouetteColor &&
			currentTask.op &&
			currentTask.channel
		) {
			silhouettes = getSilhouetteChoices(2, currentAnswer);
			currentBackgroundColor = currentTask.backgroundColor;
			currentSilhouetteColor = currentTask.silhouetteColor;
			currentChannel = currentTask.channel;
			currentOp = currentTask.op;
		}
	}

	// Handle color selection
	function handleAnswer(delta: number) {
		if (!isTestRunning) return;
		if (game.getCurrentTask().answer.includes('stage')) return;
		// Handle the player's selection in the game logic
		game.handleAnswer(delta);
		// Update the score
		const results = game.getResults();
		// Move to the next word
		nextTask();
	}

	// End the test
	function endTest() {
		isTestRunning = false;
		if (timer) clearInterval(timer);

		// Log the results
		const results = game.getResults();

		(async function () {
			new Chart(chart, {
				type: 'line',
				data: {
					labels: Array.from({ length: results.delta.length }, (_, i) => i + 1),
					datasets: [
						{
							label: 'Отклонение оттенка (ед.)',
							data: results.delta,
							borderColor: 'red',
							borderWidth: 2,
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
					}
				}
			});
		})();
	}
</script>

<h1>Компьютерная кампиметрия</h1>

{#if isHome}
	<p class="text">
		<b>Первый этап.</b> На экране отображен фон и чей-то силуэт одного и того же цвета. Необходимо нажимать
		на кнопку «Добавить оттенок», чтобы прибавлять оттенок силуэту. Когда фигурка становится распознаваемой,
		нужно нажать на верный силуэт из предложенных.
	</p>
	<p class="text">
		<b>Второй этап.</b> На экране все тот же фон и тот же силуэт, но уже отклонение от цвета фона определено
		не нажатиями на кнопку «Добавить оттенок», а от программно заданного числа шагов.
	</p>
{:else}
	<div class="subcontainer" transition:slide={{ duration: 500 }}>
		{#if !currentAnswer.includes('stage')}
			<div class="background" style={`background-color: ${currentBackgroundColor.toString()}`}>
				<div
					class="silhouette"
					style={`
				background-color: ${currentSilhouetteColor.toString()};
				mask-image: url(${data.silhouettes[currentAnswer]});
				-webkit-mask-image: url(${data.silhouettes[currentAnswer]});
				`}
				></div>
			</div>
			<button
				class="inc-button"
				onclick={() => {
					if (currentOp == '+') {
						currentChannel == 'a' ? currentSilhouetteColor.incA() : currentSilhouetteColor.incB();
					} else {
						currentChannel == 'a' ? currentSilhouetteColor.decA() : currentSilhouetteColor.decB();
					}
				}}>{currentOp == '+' ? 'Прибавить' : 'Убавить'} оттенок</button
			>
			{#if currentOp == '+'}
				<div class="row">
					{#each silhouettes as s}
						<button
							aria-label={`${s} button`}
							class="silhouette"
							style={`
							background-color: white;
							mask-image: url(${data.silhouettes[s]});
							-webkit-mask-image: url(${data.silhouettes[s]});
							`}
							onclick={() => {
								if (s == currentAnswer) {
									const delta = currentSilhouetteColor.getDelta(currentBackgroundColor);
									handleAnswer(delta);
								}
							}}
						></button>
					{/each}
				</div>
			{:else}
				<button
					class="inc-button"
					onclick={() => {
						const delta = currentSilhouetteColor.getDelta(currentBackgroundColor);
						handleAnswer(delta);
					}}
				>
					Больше не видно
				</button>
			{/if}
		{:else}
			<h1>{game.getCurrentTask().answer}</h1>
		{/if}
		{#if !isTestRunning}{/if}
	</div>
{/if}
<div class="button-container">
	<button class="start-button" onclick={startTest}
		>{isTestRunning ? 'Перезапустить тест' : 'Начать тест'}</button
	>
	{#if isTestRunning}
		<button
			class="start-button back-button"
			onclick={() => {
				isTestRunning = false;
				isHome = true;
			}}>Стоп</button
		>
	{:else}
		<a class="back-button" href="/tests">Назад</a>
	{/if}
</div>

<canvas bind:this={chart}></canvas>

<style>
	h1 {
		margin: 0;
	}
	@media (max-width: 440px) {
		h1 {
			font-size: larger;
		}
	}

	.background {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 300px;
		height: 300px;
		/* background-color: #553131; */
	}

	.silhouette {
		width: 100px;
		height: 100px;
	}

	.row {
		display: flex;
		gap: 20px;
	}
	.button-container {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}
	.start-button,
	.back-button {
		padding: 10px 20px;
		font-size: 16px;
		cursor: pointer;
	}
	.text {
		text-align: justify;
		margin: 10px 20px;
	}

	.subcontainer {
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */
		gap: 20px;
	}

	.button-container {
		display: flex;
		gap: 10px; /* Расстояние между кнопками */
		justify-content: center; /* Выравнивание по центру */
		align-items: center; /* Выравнивание по вертикали */
	}

	.inc-button {
		background-color: rgb(39, 203, 211); /* Зеленый цвет */
		color: white; /* Белый текст */
		border: none;
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
		touch-action: manipulation;
	}

	.start-button {
		background-color: green; /* Зеленый цвет */
		color: white; /* Белый текст */
		border: none;
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.start-button:hover {
		background-color: darkgreen; /* Темно-зеленый при наведении */
	}

	.back-button {
		background-color: #bf3023; /* Красный цвет */
		color: white; /* Белый текст */
		text-decoration: none; /* Убираем подчеркивание */
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.back-button:hover {
		background-color: darkred; /* Темно-красный при наведении */
	}
</style>
