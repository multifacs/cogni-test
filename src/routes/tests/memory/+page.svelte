<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { MemoryTestGame } from './memoryTestGame';
	import Chart from 'chart.js/auto';
	export let data: { words: string[] };
	
	let chart: HTMLCanvasElement | null = null;

	let words: string[] = [];
	let game: MemoryTestGame;
	let memorizationWords: string[] = [];
	let allTasks: string[] = [];
	let currentWord = '';
	let timeLeft = 0;
	let timer: number | null = null;

	let score = 0;
	let isHome = true;
	let isTestRunning = false;
	let phase: 'waiting' | 'memorize' | 'task' | 'result' = 'waiting';

	// Загрузка слов из файла
	onMount(async () => {
		words = data.words;
	});

	function toIntro() {
		isHome = true;
		isTestRunning = false;
		phase = 'waiting';
	}

	async function startTest() {
		game = new MemoryTestGame(words);
		memorizationWords = game.getMemorizationWords();
		allTasks = Array.from({ length: 10 }, (_, i) => game['tasks'][i].value);

		console.log('Загаданные слова:', memorizationWords);
		console.log('Задания:', allTasks);

		isHome = false;
		isTestRunning = true;
		score = 0;
		startWaitingPhase();
	}

	function startWaitingPhase() {
		phase = 'waiting';
		timeLeft = 3;
		const countdown = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				clearInterval(countdown);
				startMemorization();
			}
		}, 1000);
	}

	function startMemorization() {
		phase = 'memorize';
		timeLeft = 15;

		const memTimer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				clearInterval(memTimer);
				startTasks();
			}
		}, 1000);
	}

	function startTasks() {
		phase = 'task';
		nextWord();
	}

	function nextWord() {
		if (game.isGameOver()) {
			endTest();
			return;
		}

		game.startNextTask();
		currentWord = game.getCurrentTask().value;
		timeLeft = 3;

		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				clearInterval(timer);
				game.handleSelection(null);
				nextWord();
			}
		}, 1000);
	}

	function handleAnswer(answer: boolean) {
		if (timer) clearInterval(timer);
		game.handleSelection(answer);

		const results = game.getResults();
		score = results.correctAnswers.filter(Boolean).length;

		nextWord();
	}

	async function endTest() {
		phase = 'result';
		isTestRunning = false;
		await tick(); // Ждём появления canvas

		const results = game.getResults();

		new Chart(chart!, {
			type: 'line',
			data: {
				labels: Array.from({ length: results.correctAnswers.length }, (_, i) => i + 1),
				datasets: [
					{
						label: 'Скорость ответа (мс)',
						data: results.reactionTimes,
						borderColor: 'gray',
						borderWidth: 2,
						pointBackgroundColor: (ctx) => {
							const i = ctx.dataIndex;
							return results.correctAnswers[i] ? 'green' : 'red';
						},
						pointRadius: 5,
						tension: 0.4
					}
				]
			},
			options: { responsive: true }
		});
	}
</script>

{#if isHome}
	<h1>Тест на память</h1>
	<p>Вам будет показан список из 6 слов для запоминания, а затем вы должны определить — 
		какие слова из поочередно показывающегося ряда были в первоначальном списке.  Всего 10 слов на проверку.</p>
	<div class="button-container">
		<button class="primary-button" on:click={startTest}>Начать тест</button>
		<a class="back-button" href="/tests">Назад</a>
	</div>

{:else if phase === 'waiting'}
	<p>Слова появятся через {timeLeft} секунд...</p>

{:else if phase === 'memorize'}
	<h2>Запомните слова:</h2>
	<div class="mem-grid">
		{#each memorizationWords.slice(0, 3) as word}
			<div class="mem-word">{word}</div>
		{/each}
	</div>
	<div class="mem-grid">
		{#each memorizationWords.slice(3, 6) as word}
			<div class="mem-word">{word}</div>
		{/each}
	</div>
	<p>Осталось времени: {timeLeft} сек</p>

{:else if phase === 'task'}
	<h2>Было ли это слово?</h2>
	<h1>{currentWord}</h1>
	<div class="color-grid">
		<button class="yes" on:click={() => handleAnswer(true)}>ДА</button>
		<button class="no" on:click={() => handleAnswer(false)}>НЕТ</button>
	</div>
	<div>Осталось времени: {timeLeft} сек</div>

{:else if phase === 'result'}
	<h2>Результаты</h2>
	<p>Правильных ответов: {score}/10</p>
	<canvas bind:this={chart}></canvas>
	<div class="button-container">
		<button class="primary-button" on:click={toIntro}>Пройти ещё раз</button>
		<a class="back-button" href="/tests">Назад в меню</a>
	</div>
{/if}

<style>
	.color-grid {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 1rem 0;
	}

	.yes {
		background-color: rgb(5, 154, 2);
		color: white;
		text-decoration: none;
		padding: 0.75rem 1.25rem;
		border-radius: 5px;
		font-size: 1rem;
		transition: background-color 0.3s ease;
	}

	.no {
		background-color: #bf3023;
		color: white;
		text-decoration: none;
		padding: 0.75rem 1.25rem;
		border-radius: 5px;
		font-size: 1rem;
		transition: background-color 0.3s ease;
	}

	.mem-grid {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.mem-word {
		font-size: 1.5rem;
		font-weight: bold;
		background-color: rgb(2, 125, 27);
		padding: 0.5rem 1rem;
		border-radius: 6px;
	}

	.button-container {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.primary-button {
		background-color: #007acc;
		color: white;
		padding: 0.75rem 1.25rem;
		border-radius: 5px;
		font-size: 1rem;
		cursor: pointer;
		border: none;
		transition: background-color 0.3s ease;
		text-decoration: none;
	}

	.primary-button:hover {
		background-color: #005a99;
	}

	.back-button {
		background-color: #bf3023;
		color: white;
		text-decoration: none;
		padding: 0.75rem 1.25rem;
		border-radius: 5px;
		font-size: 1rem;
		transition: background-color 0.3s ease;
	}

	.back-button:hover {
		background-color: darkred;
	}
</style>
