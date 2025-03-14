<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { PageData } from './$types';
	export let data: PageData;

	let currentWord: string = 'Этап 1';
	let currentColor = '';
	let score = 0;
	let timeLeft = 3;
	let wordsLeft = -1;
	let stage = 0;
	let timer;
	let isTestRunning = false;

	const colors = {
		Красный: 'red',
		Синий: 'blue',
		Зеленый: 'green',
		Желтый: 'yellow',
		Фиолетовый: 'violet',
		Черный: 'black'
	};

	const stages = [
		{
			name: 'Этап 1',
			words: 1
		},
		{
			name: 'Этап 2',
			words: 1
		},
		{
			name: 'Этап 3',
			words: 1
		}
	];

	async function startTest() {
		isTestRunning = true;
		const delay = setTimeout(() => {
			nextWord();
			console.log('Начинаем');
		}, 1000);
	}

	async function nextWord() {
		if (!isTestRunning) return;
		if (wordsLeft == -1) {
			wordsLeft = stages[stage].words;
		}
		if (!wordsLeft && stage != stages.length - 1) {
			currentColor = 'white';
			stage += 1;
			wordsLeft = stages[stage].words;
			currentWord = stages[stage].name;
			await new Promise((r) => setTimeout(r, 2000));
		}
		if (!wordsLeft && stage == stages.length - 1) {
			currentColor = 'white';
			currentWord = 'Конец';
			isTestRunning = false;
			return;
		}
		console.log(stage);

		// Object.keys(colors);
		// Object.values(colors);
		currentWord = Object.keys(colors)[Math.floor(Math.random() * Object.keys(colors).length)];
		if (stage == 0) {
			currentColor = colors[currentWord];
		}
		if (stage != 0) {
			currentColor =
				Object.values(colors)[Math.floor(Math.random() * Object.values(colors).length)];
		}
		timeLeft = 3;
		wordsLeft -= 1;

		timer = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				clearInterval(timer);
				nextWord();
			}
		}, 1000);
	}

	function handleColorClick(color) {
		const current = colors[currentWord];
		console.log(color, current);
		if (stage < 2) {
			if (color === current) {
				score += 1;
			}
		}
		if (stage == 2) {
			if (color === currentColor) {
				score += 1;
			}
		}
		clearInterval(timer);
		nextWord();
	}

	onMount(() => {
		console.log(data);
	});
</script>

<div class="container">
	<h1>Тест Струпа</h1>
	{#if !isTestRunning}
		<p class="text">
			На экране появляются слова, обозначающие цвет. Ниже отображаются все возможные цветовые
			образцы. Нужно нажимать на цветовой образец в соответствии с заданием.
		</p>
		<p class="text">
			На первом этапе слово написано цветом, соответствующим смыслу слова. Нужно нажать на цветовой
			образец, <b>соответствующий и цвету, и смыслу слова</b>.
		</p>
		<p class="text">
			На втором этапе цвет и смысл слова разные. Нужно нажать на цветовой образец, <b
				>соответствующий смыслу слова</b
			>.
		</p>
		<p class="text">
			На третьем этапе также цвет и смысл разные. Нужно нажать на цветовой образец, <b
				>соответствующий цвету букв</b
			>.
		</p>
		<button on:click={startTest}>Начать тест</button>
	{:else}
		<div class="subcontainer" transition:slide={{ duration: 500 }}>
			<div class="color-text" style="color: {currentColor};">{currentWord}</div>
			<div class="color-grid">
				{#each Object.values(colors) as color}
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
	.text {
		text-align: justify;
		margin: 10px 20px;
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
		gap: 10px;
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
