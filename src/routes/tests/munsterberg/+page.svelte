<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	let { data } = $props();

	// Game state
	let isTestRunning = $state(false);
	let grid: { letter: string; isSelected: boolean; isCorrect: boolean; isIncorrect: boolean }[][] =
		$state([]);
	let selectedCells: { row: number; col: number }[] = [];
	let isDragging = false;
	let words: string[] = []; // Массив для хранения слов

	// Загрузка слов из файла
	onMount(async () => {
		words = data.words;
	});

	// Инициализация сетки
	function initializeGrid() {
		grid = Array.from({ length: 8 }, () =>
			Array.from({ length: 7 }, () => ({
				letter: getRandomLetter(),
				isSelected: false,
				isCorrect: false,
				isIncorrect: false
			}))
		);

		// Замена некоторых букв на слова из списка
		let row = 0;
		let col = 0;
		while (row < 8) {
			if (Math.random() < 0.2 && col + 4 < 7) {
				// 20% шанс замены
				const word = words[Math.floor(Math.random() * words.length)];
				for (let i = 0; i < 5; i++) {
					grid[row][col + i].letter = word[i];
				}
				col += 5;
			} else {
				col++;
			}
			if (col >= 7) {
				row++;
				col = 0;
			}
		}
	}

	// Генерация случайной буквы
	function getRandomLetter(): string {
		return String.fromCharCode(65 + Math.floor(Math.random() * 26));
	}

	// Обработка начала выделения
	function handlePointerDown(event: PointerEvent) {
		isDragging = true;
		highlightCell(event);
	}

	// Обработка перемещения указателя
	function handlePointerMove(event: PointerEvent) {
		if (isDragging) {
			highlightCell(event);
		}
	}

	// Обработка окончания выделения
	function handlePointerUp() {
		isDragging = false;
		const selectedWord = grid.flatMap((row, rowIndex) =>
			row
				.map((cell, colIndex) => (cell.isSelected ? cell.letter : ''))
				.join('')
				.replace(/\s+/g, '')
		); // Убираем пробелы

		console.log(selectedWord)
		if (words.includes(selectedWord)) {
			grid.forEach((row) => {
				row.forEach((cell) => {
					if (cell.isSelected) {
						cell.isCorrect = true;
					}
				});
			});
		} else {
			grid.forEach((row) => {
				row.forEach((cell) => {
					if (cell.isSelected) {
						cell.isIncorrect = true;
					}
				});
			});
			setTimeout(() => {
				grid.forEach((row) => {
					row.forEach((cell) => {
						cell.isIncorrect = false;
						cell.isSelected = false;
					});
				});
			}, 1000);
		}
	}

	// Подсветка ячейки по координатам указателя
	function highlightCell(event: PointerEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const cellSize = 50; // Размер ячейки
		const col = Math.floor(x / cellSize);
		const row = Math.floor(y / cellSize);

		if (row >= 0 && row < 8 && col >= 0 && col < 7) {
			grid[row][col].isSelected = true;
		}
	}

	// Запуск теста
	async function startTest() {
		isTestRunning = true;
		initializeGrid();
	}

	let isMouseDown = $state(false);
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
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
			></div>
			<div class="grid">
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
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(7, 50px);
		grid-template-rows: repeat(8, 50px);
		gap: 5px;
	}
	.overlay {
		position: absolute;
		width: 100%;
		height: 100%;
		background: transparent;
		cursor: pointer;
	}
	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #000;
		cursor: pointer;
	}
	.selected {
		background-color: yellow;
	}
	.correct {
		background-color: green;
	}
	.incorrect {
		background-color: red;
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
