<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/button.svelte';
	import { onMount } from 'svelte';
	let { data } = $props();

	let innerWidth: number;
	let innerHeight: number;

	type Cell = {
		letter: string;
		isCorrect: boolean;
		isIncorrect: boolean;
	};

	type Word = {
		value: string;
		row: number;
		col: number;
		guessed: boolean;
	};

	const GRID_COLS = 9;
	const GRID_ROWS = 11;
	let CELL_W = 42;
	let CELL_H = 42;

	// Game state
	let isTestRunning = $state(false);
	let isHome = $state(true);
	let grid: Cell[][] = $state([]);
	let isDragging = false;
	let words: string[] = $state([]); // Массив для хранения слов

	let overlay: HTMLElement = $state(Object());

	const generatedWords: Word[] = $state([]);
	let guessedCount = $derived(generatedWords.filter((x) => x.guessed == true).length);
	const selectedCells: { cell: Cell; i: number; j: number }[] = [];
	let timer = $state(60);
	let timerInterval = $state(Object());

	// Загрузка слов из файла
	onMount(async () => {
		words = data.words;
		console.log(innerWidth, innerHeight);
		if (innerWidth < 400) {
			CELL_W = 30;
			CELL_H = 30;
		}
	});

	// Запуск теста
	async function startTest() {
		if (typeof timerInterval != 'object') clearInterval(timerInterval);
		isTestRunning = true;
		isHome = false;
		timer = 60;
		initializeGrid();

		timerInterval = setInterval(() => {
			timer -= 1;
			if (!timer || guessedCount == generatedWords.length) {
				clearInterval(timerInterval);
				isTestRunning = false;
				highlightUnguessed();
			}
		}, 1000);
	}

	function getRandomLetter() {
		const abc = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
		const randomCharIdx = Math.round(Math.random() * 32);
		return abc.charAt(randomCharIdx);
	}

	// Инициализация сетки
	function initializeGrid() {
		generatedWords.length = 0;

		grid = Array.from({ length: GRID_ROWS }, () =>
			Array.from({ length: GRID_COLS }, () => ({
				letter: getRandomLetter(),
				isCorrect: false,
				isIncorrect: false
			}))
		);

		// Замена некоторых букв на слова из списка
		let row = 0;
		let count = 0;
		while (row < GRID_ROWS) {
			if (Math.random() < 0.7) {
				count++;
				const word = words[Math.floor(Math.random() * words.length)];
				let col = Math.round(Math.random() * (GRID_COLS - word.length));
				console.log(word, row, col);
				generatedWords.push({ value: word, row, col, guessed: false });
				for (let i = 0; i < word.length; i++) {
					grid[row][col + i].letter = word[i].toUpperCase();
				}
				row++;
			} else {
				row++;
			}
		}
		console.log('count:', count);
	}

	let lastI = $state(-1);
	let lastJ1 = $state(-1);
	let lastJ2 = $state(-1);

	function clamp(n: number, min: number, max: number) {
		return Math.min(Math.max(n, min), max);
	}

	function getTouchIJ(e: TouchEvent) {
		const j = clamp(
			Math.floor((e.touches[0].clientX - overlay.offsetLeft) / CELL_W),
			0,
			GRID_COLS - 1
		);
		const i = clamp(
			Math.floor((e.touches[0].clientY - overlay.offsetTop) / CELL_H),
			0,
			GRID_ROWS - 1
		);
		return { j, i };
	}

	const delay = (delayInms: number) => {
		return new Promise((resolve) => setTimeout(resolve, delayInms));
	};

	async function resetCells() {
		if (lastJ1 == -1 && lastJ2 != -1) {
			lastJ1 = lastJ2;
		}
		if (lastJ2 == -1 && lastJ1 != -1) {
			lastJ2 = lastJ1;
		}

		checkWord();
		for (let j = lastJ1; j <= lastJ2; j++) {
			if (!grid[lastI][j].isCorrect) {
				grid[lastI][j].isIncorrect = true;
			}
		}
		await delay(200);
		for (let j = 0; j < GRID_COLS; j++) {
			grid[lastI][j].isIncorrect = false;
		}
		selectedCells.length = 0;
		lastI = -1;
		lastJ1 = -1;
		lastJ2 = -1;
	}

	function checkWord() {
		if (lastJ1 == -1 || lastJ2 == -1) return;

		if (lastJ1 > lastJ2) {
			const temp = lastJ1;
			lastJ1 = lastJ2;
			lastJ2 = temp;
		}
		let selectedWord = '';
		for (let j = lastJ1; j <= lastJ2 && j != -1; j++) {
			selectedWord += grid[lastI][j].letter;
		}
		const generated = generatedWords.filter(
			(x) => x.guessed == false && x.row == lastI && x.value == selectedWord.toLowerCase()
		);
		if (generated.length != 0) {
			generated[0].guessed = true;
			for (let j = lastJ1; j <= lastJ2; j++) {
				grid[lastI][j].isCorrect = true;
			}
		}
	}

	function highlightUnguessed() {
		generatedWords.forEach((word) => {
			if (!word.guessed) {
				for (let j = word.col; j <= word.col + word.value.length - 1; j++) {
					grid[word.row][j].isIncorrect = true;
				}
			}
		});
	}

	async function touchHandler(e: TouchEvent) {
		if (!isTestRunning) return;
		switch (e.type) {
			case 'touchstart': {
				isDragging = true;
				const { j, i } = getTouchIJ(e);
				lastI = i;
				lastJ1 = j;
				break;
			}
			case 'touchmove': {
				const { j, i } = getTouchIJ(e);
				if (i == lastI) {
					lastJ2 = j;
				}
				break;
			}
			case 'touchend': {
				isDragging = false;
				await resetCells();
				break;
			}
		}
	}

	function getPointerIJ(e: PointerEvent) {
		const j = clamp(Math.floor((e.clientX - overlay.offsetLeft) / CELL_W), 0, GRID_COLS - 1);
		const i = clamp(Math.floor((e.clientY - overlay.offsetTop) / CELL_H), 0, GRID_ROWS - 1);
		return { j, i };
	}

	async function pointerHandler(e: PointerEvent) {
		if (!isTestRunning) return;
		if (e.pointerType == 'touch') return;
		switch (e.type) {
			case 'pointerdown': {
				isDragging = true;
				const { j, i } = getPointerIJ(e);
				lastI = i;
				lastJ1 = j;
				break;
			}
			case 'pointermove': {
				if (isDragging) {
					const { j, i } = getPointerIJ(e);
					if (i == lastI) {
						lastJ2 = j;
					}
				}
				break;
			}
			case 'pointerup': {
				isDragging = false;
				await resetCells();
				break;
			}
			case 'pointerout': {
				if (isDragging) {
					isDragging = false;
					await resetCells();
				}
				break;
			}
		}
	}

	function checkSelected(i: number, j: number): boolean {
		if (lastJ1 == -1 || lastJ2 == -1) return false;
		return i == lastI && ((j >= lastJ1 && j <= lastJ2) || (j >= lastJ2 && j <= lastJ1));
	}
</script>

{#if words.length <= 19}
	<h1>Тест Хуюнстерберга</h1>
{:else}
	<h1>Тест Мюнстерберга</h1>
{/if}

{#if isHome}
	<p>
		На большом экране в течение 1 минуты отображается матрица из букв. В ней необходимо по
		горизонтали справа налево находить слова. На экране телефона каждое найденное слово нужно
		выделить.
	</p>
{:else}
	<div class="subcontainer">
		<div class="grid-container">
			<div
				class="overlay"
				bind:this={overlay}
				ontouchstart={touchHandler}
				ontouchmove={touchHandler}
				ontouchend={touchHandler}
				onpointerdown={pointerHandler}
				onpointermove={pointerHandler}
				onpointerup={pointerHandler}
				onpointerout={pointerHandler}
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
								class="cell
								{checkSelected(rowIndex, colIndex) ? 'selected' : ''}
								{cell.isCorrect ? 'correct' : ''}
								{cell.isIncorrect ? 'incorrect' : ''}
								"
							>
								{cell.letter}
							</div>
						{/each}
					{/each}
				</div>
			</div>
		</div>
		<!-- <h3 style="margin: 0">
			Загадано {generatedWords.length} слов{generatedWords.length < 5
				? generatedWords.length == 1
					? 'о'
					: 'а'
				: ''}
		</h3> -->
		{#if isTestRunning}
			<h3>{`0${timer == 60 ? 1 : 0}:${timer % 60 < 10 ? '0' : ''}${timer % 60}`}</h3>
		{:else}
			<h3>Вы отгадали {guessedCount}/{generatedWords.length}</h3>
		{/if}
	</div>
{/if}
<div class="button-container">
	<Button color="green" onclick={startTest}
		>{isTestRunning ? 'Перезапустить тест' : 'Начать тест'}</Button
	>
	{#if isTestRunning}
		<Button
			color="red"
			onclick={() => {
				isTestRunning = false;
				isHome = true;
			}}>Стоп</Button
		>
	{:else}
		<Button
			color="red"
			onclick={() => {
				goto('/tests');
			}}>Назад</Button
		>
	{/if}
</div>

<svelte:window bind:innerWidth bind:innerHeight />

<style>
	.grid {
		display: grid;
		touch-action: none;
		user-select: none;
	}
	.overlay {
		width: 100%;
		height: 100%;
		background-color: transparent;
		border: 1px solid var(--color-gray-700);
		cursor: pointer;
		box-sizing: border-box;
		touch-action: none;
		user-select: none;
	}
	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-gray-700);
		cursor: pointer;
		box-sizing: border-box;
		z-index: -1;
		user-select: none;
		transition: 0.5s ease;
	}
	.selected {
		background-color: rgb(249, 193, 98);
	}
	.correct {
		background-color: rgb(152, 222, 86);
		color: var(--main-bg-color);
	}
	.incorrect {
		background-color: rgb(251, 88, 69);
	}
	.button-container {
		display: flex;
		gap: 10px;
		margin-top: 20px;
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
</style>
