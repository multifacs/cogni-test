<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { MemoryGame } from './memory-game';

	export let data: { words: string[] };

	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import ResultsChart from '$lib/components/charts/ResultsChart.svelte';

	let words: string[] = [];
	let game: MemoryGame;
	let memorizationWords: string[] = [];
	let allTasks: string[] = [];
	let currentWord = '';
	let timeLeft = 0;
	let timer: ReturnType<typeof setInterval>;

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
		game = new MemoryGame(words);
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
		score = results.filter((x) => x.isCorrect).length;

		nextWord();
	}

	async function endTest() {
		phase = 'result';
		isTestRunning = false;
		await tick(); // Ждём появления canvas
	}
</script>

{#if isHome}
	<h1>Тест на память</h1>
	<p>
		Вам будет показан список из 6 слов для запоминания, а затем вы должны определить — какие слова
		из поочередно показывающегося ряда были в первоначальном списке. Всего 10 слов на проверку.
	</p>
	<div class="button-container">
		<Button color="green" onclick={startTest}>Начать тест</Button>
		<Button
			color="red"
			onclick={() => {
				goto('/tests');
			}}>Назад</Button
		>
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
		<Button kind="big" color="green" onclick={() => handleAnswer(true)}>ДА</Button>
		<Button kind="big" color="red" onclick={() => handleAnswer(false)}>НЕТ</Button>
	</div>
	<div>Осталось времени: {timeLeft} сек</div>
{:else if phase === 'result'}
	<h2>Результаты</h2>
	<p>Правильных ответов: {score}/10</p>
	<ResultsChart stages={1} results={game.getResults()} xtitle="Нажатие" ytitle="Время реакции (мс)"
	></ResultsChart>
	<div class="button-container">
		<Button color="blue" onclick={toIntro}>Пройти ещё раз</Button>
		<Button
			color="red"
			onclick={() => {
				goto('/tests');
			}}>Назад в меню</Button
		>
	</div>
{/if}

<style>
	.color-grid {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 1rem 0;
	}
	.mem-grid {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.mem-word {
		font-size: 16px;
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
</style>
