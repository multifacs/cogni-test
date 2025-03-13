<script>
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	let currentWord = 'Начинаем';
	let currentColor = '';
	let score = 0;
	let timeLeft = 3;
	let timer;
	let isTestRunning = false;

	const words = ['Красный', 'Синий', 'Зеленый', 'Желтый', 'Фиолетовый', 'Черный'];
	const colors = ['red', 'blue', 'green', 'yellow', 'violet', 'black'];

	function startTest() {
		isTestRunning = true;
		const delay = setTimeout(() => {
			nextWord();
			console.log('Начинаем');
		}, 1000);
	}

	function nextWord() {
		if (!isTestRunning) return;

		currentWord = words[Math.floor(Math.random() * words.length)];
		currentColor = colors[Math.floor(Math.random() * colors.length)];
		timeLeft = 3;

		timer = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				clearInterval(timer);
				nextWord();
			}
		}, 1000);
	}

	function handleColorClick(color) {
		if (color === currentColor) {
			score += 1;
		}
		clearInterval(timer);
		nextWord();
	}
</script>

<div class="container">
	<h1>Тест Струпа</h1>
	{#if !isTestRunning}
		<button on:click={startTest}>Начать тест</button>
	{:else}
		<div class="subcontainer" transition:slide={{ duration: 500 }}>
			<div class="color-text" style="color: {currentColor};">{currentWord}</div>
			<div class="color-grid">
				{#each colors as color}
					<button
						class="color-button"
						style="background-color: {color};"
						aria-label={color}
						on:click={() => handleColorClick(color)}
					></button>
				{/each}
			</div>
			<div>Осталось времени: {timeLeft} сек</div>
			<div>Счет: {score}</div>
		</div>
	{/if}

	{#if !isTestRunning && score > 0}
		<div>Тест завершен! Ваш счет: {score}</div>
	{/if}
</div>

<style>
	h1 {
		color: #f8faff;
	}
	.color-button {
		padding: 10px 20px;
		margin: 5px;
		width: 80px;
		height: 60px;
		border: none;
		cursor: pointer;
	}
	.color-text {
		font-weight: bold;
		font-size: 2em;
		margin-bottom: 20px;
        -webkit-text-stroke-color: #5c70a3;
		-webkit-text-stroke: 1px;
	}

	.container {
		max-width: 600px;
		margin: 10vh auto;
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */

		height: 500px;
		transition: height 0.5s ease; /* Анимация изменения высоты */
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
	}

	@media (max-width: 600px) {
		.color-text {
			font-size: 1.5em;
		}
		.color-button {
			padding: 8px 16px;
		}
	}
</style>
