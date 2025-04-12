<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	// import { tick } from 'svelte';
	import { BirdGame, type Direction } from './logic/bird-game';

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

	const directionToRotation = {
		up: 'rotate(0deg)',
		right: 'rotate(90deg)',
		down: 'rotate(180deg)',
		left: 'rotate(-90deg) scaleX(-1)'
	};

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
		phase = 'result';
	}
</script>

<div class="top-bar flex justify-center items-center">
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
h-30
w-30
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
		style="transform: {directionToRotation[currentTask.direction]};"
	/>
</div>

<div class="controls grid w-40 grid-cols-3 grid-rows-2 gap-2">
	<div></div>
	<Button color="blue" onclick={() => handleAnswer('up')}><b>⬆</b></Button>
	<div></div>
	<Button color="blue" onclick={() => handleAnswer('left')}><b>⬅</b></Button>
	<Button color="blue" onclick={() => handleAnswer('down')}><b>⬇</b></Button>
	<Button color="blue" onclick={() => handleAnswer('right')}><b>➡</b></Button>
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
