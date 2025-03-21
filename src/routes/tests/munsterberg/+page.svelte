<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	let { data } = $props();

	const GRID_COLS = 9;
	const GRID_ROWS = 11;
	const CELL_W = 42;
	const CELL_H = 42;

	// Game state
	let isTestRunning = $state(false);
	let grid: { letter: string; isSelected: boolean; isCorrect: boolean; isIncorrect: boolean }[][] =
		$state([]);
	let selectedCells: { row: number; col: number }[] = [];
	let isDragging = false;
	let words: string[] = []; // Массив для хранения слов

	let overlay: HTMLElement = $state(Object());

	const generatedWords: string[] = [];

	// Загрузка слов из файла
	onMount(async () => {
		words = data.words;
	});

	function getRandomLetter() {
		// Generate a random number between 65 (A) and 90 (Z)
		// Russian 410-159
		const randomCharCode = Math.floor(Math.random() * 32) + 1040;
		// Convert the ASCII code to a character
		return String.fromCharCode(randomCharCode);
	}

	// Инициализация сетки
	function initializeGrid() {
		grid = Array.from({ length: GRID_ROWS }, () =>
			Array.from({ length: GRID_COLS }, () => ({
				letter: getRandomLetter(),
				isSelected: false,
				isCorrect: false,
				isIncorrect: false
			}))
		);

		// Замена некоторых букв на слова из списка
		let row = 0;
		let col = 0;
		while (row < GRID_ROWS) {
			if (Math.random() < 0.5) {
				// 20% шанс замены
				const word = words[Math.floor(Math.random() * words.length)];
				let col = Math.round(Math.random() * (GRID_COLS - 1 - word.length));
				console.log(word, row, col);
				generatedWords.push(word);
				for (let i = 0; i < word.length; i++) {
					grid[row][col + i].letter = word[i].toUpperCase();
				}
				row++;
			} else {
				row++;
			}
		}
	}

	// Запуск теста
	async function startTest() {
		isTestRunning = true;
		initializeGrid();
	}

	// let lastX = Math.round(e.offsetX / GRID_COLS);
	// let lastY = Math.round(e.offsetY / GRID_ROWS);
	let lastX = -1;
	let lastY = -1;

	function moveHandler(e: PointerEvent) {
		if (e.pointerType == 'touch') return;
		// console.log(e.offsetX)
		let x = Math.floor(e.offsetX / (380 / GRID_COLS));
		let y = Math.floor(e.offsetY / (435 / GRID_ROWS));
		if (x != lastX) {
			lastX = x;
			console.log('x: ', x);
			grid[y][x].isSelected = true;
		}
		if (y != lastY) {
			lastY = y;
			console.log('y: ', y);
			grid[y][x].isSelected = true;
		}
	}

	function getTouchIJ(e: TouchEvent) {
		const j = Math.floor((e.touches[0].clientX - overlay.offsetLeft) / CELL_W);
		const i = Math.floor((e.touches[0].clientY - overlay.offsetTop) / CELL_H);
		return { j, i };
	}

	function selectCell(i: number, j: number) {
		if (!grid[i][j].isSelected) grid[i][j].isSelected = true;
	}

	function resetCells() {
		for (let i = 0; i < GRID_ROWS; i++) {
			for (let j = 0; j < GRID_COLS; j++) {
				grid[i][j].isSelected = false;
			}
		}
	}

	function touchHandler(e: TouchEvent) {
		switch (e.type) {
			case 'touchstart': {
				isDragging = true;
				const { j, i } = getTouchIJ(e);
				selectCell(i, j);
				break;
			}
			case 'touchmove': {
				const { j, i } = getTouchIJ(e);
				selectCell(i, j);
				break;
			}
			case 'touchend': {
				isDragging = false;
				resetCells();
				break;
			}
		}
	}
</script>

<h1>Тест Мюнстерберга</h1>
{#if !isTestRunning}
	<p class="text">
		На большом экране в течение 1 минуты отображается матрица из букв. В ней необходимо по
		горизонтали справа налево находить слова. На экране телефона каждое найденное слово нужно
		выделить.
	</p>
	<div class="button-container">
		<button class="start-button" onclick={startTest}>Начать тест</button>
		<a class="back-button" href="/tests">Назад</a>
	</div>
{:else}
	<div class="subcontainer" transition:slide={{ duration: 500 }}>
		<div class="grid-container">
			<div
				class="overlay"
				bind:this={overlay}
				ontouchstart={touchHandler}
				ontouchmove={touchHandler}
				ontouchend={touchHandler}
			>
				<div
					class="grid"
					style="
					grid-template-columns: repeat({GRID_COLS}, {CELL_W}px);
					grid-template-rows: repeat({GRID_ROWS}, {CELL_H}px);
					"
				>
					{#each grid as row, rowIndex}
						{#each row as cell, colIndex}
							<div
								class="cell {cell.isSelected ? 'selected' : ''} {cell.isCorrect
									? 'correct'
									: ''} {cell.isIncorrect ? 'incorrect' : ''}"
							>
								{cell.letter}
							</div>
						{/each}
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.grid {
		display: grid;
	}
	.overlay {
		width: 100%;
		height: 100%;
		background-color: transparent;
		border: 1px solid rgb(0, 0, 0);
		cursor: pointer;
		box-sizing: border-box;
	}
	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #000;
		cursor: pointer;
		box-sizing: border-box;
		z-index: -1;
		user-select: none;
	}
	.selected {
		background-color: rgb(249, 193, 98);
	}
	.correct {
		background-color: rgb(158, 245, 77);
	}
	.incorrect {
		background-color: rgb(251, 88, 69);
	}
	.button-container {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}
	.start-button,
	.back-button {
		padding: 10px 20px;
		font-size: 16px;
		cursor: pointer;
	}
	.text {
		text-align: justify;
		margin: 10px 20px;
	}

	.subcontainer {
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */
		gap: 20px;
	}

	.button-container {
		display: flex;
		gap: 10px; /* Расстояние между кнопками */
		justify-content: center; /* Выравнивание по центру */
		align-items: center; /* Выравнивание по вертикали */
	}

	.start-button {
		background-color: green; /* Зеленый цвет */
		color: white; /* Белый текст */
		border: none;
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.start-button:hover {
		background-color: darkgreen; /* Темно-зеленый при наведении */
	}

	.back-button {
		background-color: #bf3023; /* Красный цвет */
		color: white; /* Белый текст */
		text-decoration: none; /* Убираем подчеркивание */
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.back-button:hover {
		background-color: darkred; /* Темно-красный при наведении */
	}
</style>
