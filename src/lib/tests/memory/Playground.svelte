<script lang="ts">
	import { onMount } from 'svelte';
	import { MemoryGame } from './logic/memory-game';
	import Button from '$lib/components/ui/Button.svelte';

	let { data, gameEnd }: { data: { words: string[] }; gameEnd: () => void } = $props();

	let words: string[] = [];
	let game: MemoryGame = $state(Object());
	let memorizationWords: string[] = $state([]);
	let allTasks: string[] = [];
	let currentWord = $state('');
	let timeLeft = $state(0);
	let timer: ReturnType<typeof setInterval>;

	let score = $state(0);
	let isHome = $state(true);
	let isTestRunning = $state(false);
	let phase: 'waiting' | 'memorize' | 'task' | 'result' = $state('waiting');

	// Загрузка слов из файла
	onMount(async () => {
		words = data.words;
	});

	function toIntro() {
		isHome = true;
		isTestRunning = false;
		phase = 'waiting';
	}

	export function resetGame() {
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
			stopGame();
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

	export function stopGame() {
		phase = 'waiting';
		isTestRunning = false;
		gameEnd();
	}
</script>

{#if isHome}{:else if phase === 'waiting'}
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
