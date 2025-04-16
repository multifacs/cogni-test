<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onDestroy, onMount } from 'svelte';

	// import { tick } from 'svelte';
	import { BirdGame } from './logic/bird-game';
	import { type Direction } from './types';

	let { gameEnd, sendResults } = $props();

	let game: BirdGame;
	let currentTask = $state({
		background: 'red',
		direction: 'up'
	});
	let lives = $state(3);
	let timeLeft = $state(60);
	let timer: any = null;
	let phase: 'intro' | 'test' | 'result' = 'intro';
	let results = [];

	let isGameOver = $derived(lives <= 0);

	const directionToRotation: Record<Direction, string> = {
		up: 'rotate(0deg)',
		right: 'rotate(90deg)',
		down: 'rotate(180deg)',
		left: 'rotate(-90deg) scaleX(-1)'
	};

	onMount(() => {
		resetGame();
	});

	export function resetGame() {
		game = new BirdGame();
		lives = 3;
		timeLeft = 60;
		results = [];
		phase = 'test';
		currentTask = game.getCurrentTask();
		game.startNextTask();

		timer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				stopGame();
			}
		}, 1000);
	}

	function handleAnswer(answer: Direction) {
		game.handleAnswer(answer);
		lives = game.getLives();
		results = game.getResults();

		if (game.isGameOver()) {
			stopGame();
			return;
		}

		currentTask = game.getCurrentTask();
		game.startNextTask();
	}

	export function stopGame() {
		clearInterval(timer);
		game.setLives(0);
		phase = 'result';
		gameEnd();
		sendResults(game.getResults());
	}

	function checkDirection(str: string): Direction {
		if (str == 'up' || str == 'down' || str == 'left' || str == 'right') {
			return str as Direction;
		}
		throw 'incorrect direction in swallow test';
	}

	onDestroy(() => {
		clearInterval(timer);
	});
</script>

<div class="top-bar flex items-center justify-center">
	<div class="lives">
		{#each Array(lives) as _, i}
			<span class="heart">❤️</span>
		{/each}
	</div>
	<div class="timer">⏱ {timeLeft} сек</div>
</div>

{#if currentTask.background === 'blue'}
	<h2>Куда летит ласточка?</h2>
{:else}
	<h2>Откуда летит ласточка?</h2>
{/if}

<div
	class="
bird-wrapper
flex
h-40
w-40
items-center
justify-center
rounded-full
"
	style="background-color: {currentTask.background};"
>
	<img
		src="/tests/swallow.svg"
		alt="bird"
		class="bird-img h-24 w-24 transform"
		style="transform: {directionToRotation[checkDirection(currentTask.direction)]};"
	/>
</div>

<div class="controls grid w-40 grid-cols-3 grid-rows-2 gap-2">
	<div></div>
	<Button color="blue" disabled={isGameOver} onclick={() => handleAnswer('up')}><b>⬆</b></Button>
	<div></div>
	<Button color="blue" disabled={isGameOver} onclick={() => handleAnswer('left')}><b>⬅</b></Button>
	<Button color="blue" disabled={isGameOver} onclick={() => handleAnswer('down')}><b>⬇</b></Button>
	<Button color="blue" disabled={isGameOver} onclick={() => handleAnswer('right')}><b>➡</b></Button
	>
</div>

<style>
	.lives .heart {
		font-size: 1.5rem;
		margin-right: 5px;
	}

	.timer {
		font-size: 1.2rem;
	}
</style>
