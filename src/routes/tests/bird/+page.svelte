<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { BirdGame, type Direction } from './bird-game';
	import Chart from 'chart.js/auto';

	let game: BirdGame;
	let currentTask;
	let lives = 3;
	let timeLeft = 60;
	let timer: any = null;
	let phase: 'intro' | 'test' | 'result' = 'intro';
	let chart: HTMLCanvasElement | null = null;

	let results = [];

	const directionToRotation = {
		up: 'rotate(0deg)',
		right: 'rotate(90deg)',
		down: 'rotate(180deg)',
		left: 'rotate(-90deg) scaleX(-1)'
	};

	function startTest() {
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
				endTest();
			}
		}, 1000);
	}

	function handleAnswer(answer: Direction) {
		game.handleAnswer(answer);
		lives = game.getLives();
		results = game.getResults();

		if (game.isGameOver()) {
			endTest();
			return;
		}

		currentTask = game.getCurrentTask();
		game.startNextTask();
	}

	async function endTest() {
		clearInterval(timer);
		phase = 'result';
		await tick();

		const filtered = game.getResults().filter(r => r.isCorrect);
		const allResults = game.getResults();
		
		new Chart(chart, {
		type: 'line',
		data: {
			labels: allResults.map((_, i) => i + 1),
			datasets: [{
				label: 'Время ответа (мс)',
				data: allResults.map(r => r.time),
				borderColor: 'gray',
				borderWidth: 2,
				pointBackgroundColor: (ctx) => {
					const i = ctx.dataIndex;
					return allResults[i].isCorrect ? 'green' : 'red';
				},
				pointRadius: 5,
				tension: 0.3
			}]
		},
		options: { responsive: true }
		});
	}
</script>

{#if phase === 'intro'}
	<h1>Тест «Ласточка»</h1>
	<p>Ваша задача — определить направление полёта птицы.</p> 
	<p>В центре экрана появляется птичка в круге. 
		Она может быть повернута: вверх, вниз, влево или вправо. Фон круга может быть синим или красным: 
		если фон синий, выберите направление куда летит птичка;
		если фон красный, выберите — откуда она прилетела.</p> 
	<p>У вас есть 3 жизни. Каждый неверный ответ отнимает одну.
		Время ограничено — 60 секунд, постарайтесь дать как можно больше ответов.</p>
		
	<p>Правильность и скорость ваших ответов будут отображены на графике в конце. </p>
	<button class="primary-button" on:click={startTest}>Начать</button>
{/if}

{#if phase === 'test'}
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
		<img src="/bird.svg" alt="bird" class="bird-img" style="transform: {directionToRotation[currentTask.direction]};" />
	</div>

	<div class="controls">
		<button on:click={() => handleAnswer('up')}>⬆</button>
		<div class="horiz">
			<button on:click={() => handleAnswer('left')}>⬅</button>
			<span style="width: 40px;"></span>
			<button on:click={() => handleAnswer('right')}>➡</button>
		</div>
		<button on:click={() => handleAnswer('down')}>⬇</button>
	</div>
{/if}

{#if phase === 'result'}
	<h2>Результаты</h2>
	<p>Правильных ответов: {results.filter(r => r.isCorrect).length} из {results.length}</p>
	<canvas bind:this={chart}></canvas>
	<div class="button-container">
		<button class="primary-button" on:click={() => phase = 'intro'}>Пройти ещё раз</button>
		<a class="back-button" href="/tests">Назад</a>
	</div>
{/if}

<style>
	.primary-button {
		background-color: #007acc;
		color: white;
		padding: 0.75rem 1.25rem;
		border-radius: 5px;
		font-size: 1rem;
		cursor: pointer;
		border: none;
		transition: background-color 0.3s ease;
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

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 20px;
		gap: 20px;
	}

	.controls button {
		font-size: 2.5rem;
		padding: 10px 25px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		background-color: #ffffff;
	}

	.horiz {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 60px;
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
