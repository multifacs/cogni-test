<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { MemoryGame } from './logic/memory-game';
	import Button from '$lib/components/ui/Button.svelte';
	import type { MemoryResult } from './types';

	interface MemoryAndMeta {
		results: MemoryResult[];
		meta: string[];
	}

	let {
		data,
		gameEnd,
		sendResults
	}: {
		data: { words: string[] };
		gameEnd: () => void;
		sendResults: (res: MemoryAndMeta) => void;
	} = $props();

	let words: string[] = [];
	let game: MemoryGame = $state(Object());
	let memorizationWords: string[] = $state([]);
	let allTasks: string[] = [];
	let currentWord = $state('');
	let timeLeft = $state(0);
	let timer: ReturnType<typeof setInterval>;

	let phase: 'waiting' | 'memorize' | 'task' | 'result' = $state('waiting');

	// Загрузка слов из файла
	onMount(async () => {
		words = data.words;
		resetGame();
	});

	export function resetGame() {
		game = new MemoryGame(words);
		memorizationWords = game.getMemorizationWords();
		allTasks = Array.from({ length: 10 }, (_, i) => game['tasks'][i].value);

		console.log('Загаданные слова:', memorizationWords);
		console.log('Задания:', allTasks);

		startWaitingPhase();
	}

	function startWaitingPhase() {
		phase = 'waiting';
		timeLeft = 5;
		timer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				clearInterval(timer);
				startMemorization();
			}
		}, 1000);
	}

	function startMemorization() {
		phase = 'memorize';
		timeLeft = 15;

		timer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				clearInterval(timer);
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
		timeLeft = 5;

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
		nextWord();
	}

	export function stopGame() {
		phase = 'result';
		gameEnd();
		sendResults({
			results: game.getResults(),
			meta: game.getWords()
		});
	}

	onDestroy(() => {
		clearInterval(timer);
	});
</script>

{#if phase === 'waiting'}
	<p class="sm:text-2xl">Слова появятся через {timeLeft} секунд...</p>
{:else if phase === 'memorize'}
	<p class="sm:text-2xl">Запомните слова:</p>
	<div class="flex flex-col gap-2">
		<div class="mem-grid">
			{#each memorizationWords.slice(0, 3) as word (word)}
				<Button color="green">{word}</Button>
			{/each}
		</div>
		<div class="mem-grid">
			{#each memorizationWords.slice(3, 6) as word (word)}
				<Button color="green">{word}</Button>
			{/each}
		</div>
	</div>
	<p class="sm:text-2xl">Осталось времени: {timeLeft} сек</p>
{:else if phase === 'task'}
	<p class="sm:text-2xl">Было ли это слово?</p>
	<h1 class="text-center">{currentWord}</h1>
	<div class="color-grid">
		<Button color="green" onclick={() => handleAnswer(true)}>ДА</Button>
		<Button color="red" onclick={() => handleAnswer(false)}>НЕТ</Button>
	</div>
	<p class="sm:text-2xl">Осталось времени: {timeLeft} сек</p>
{:else}
	<h1 class="text-center">Конец теста</h1>
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
</style>
