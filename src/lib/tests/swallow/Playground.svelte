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

<div class="top-bar">
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

<div class="bird-wrapper" style="background-color: {currentTask.background};">
	<img
		src="/tests/swallow.svg"
		alt="bird"
		class="bird-img"
		style="transform: {directionToRotation[currentTask.direction]};"
	/>
</div>

<div class="controls grid w-48 grid-cols-3 grid-rows-3 gap-2">
	<div></div>
	<Button color="blue" onclick={() => handleAnswer('up')}>⬆</Button>
	<div></div>
	<Button color="blue" onclick={() => handleAnswer('left')}>⬅</Button>
	<div></div>
	<Button color="blue" onclick={() => handleAnswer('right')}>➡</Button>
	<div></div>
	<Button color="blue" onclick={() => handleAnswer('down')}>⬇</Button>
	<div></div>
</div>

<style>
	.bird-wrapper {
		margin: 20px auto;
		width: 200px;
		height: 200px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bird-img {
		width: 100px;
		height: 100px;
		transition: transform 0.3s ease;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		padding: 10px 20px;
	}

	.lives .heart {
		font-size: 1.5rem;
		margin-right: 5px;
	}

	.timer {
		font-size: 1.2rem;
	}
</style>
