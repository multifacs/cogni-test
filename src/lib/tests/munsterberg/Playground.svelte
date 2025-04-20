<script lang="ts">
	import { clamp, delay } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import type { Cell, Word, Selection, MunsterbergResult } from './types';

	// Props
	let { data, gameEnd, sendResults } = $props();

	// Grid settings
	const GRID_COLS = 9;
	const GRID_ROWS = 11;
	let CELL_W = $state(42);
	let CELL_H = $state(42);

	// State
	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let isGameRunning = $state(false);
	let timer = $state(60);
	let timerInterval: any = $state(null);

	let grid: Cell[][] = $state([]);
	let words: string[] = $state([]);
	let generatedWords: Word[] = $state([]);
	let guessedCount = $derived(generatedWords.filter((w) => w.guessed).length);

	let overlay: HTMLElement;
	let currentSelection: Selection | null = $state(null);
	let isDragging = false;
	let isResetting = false;

	// Time tracking
	let startTime: number = $state(0);

	onMount(() => {
		words = data.words;
		if (innerWidth < 400) {
			CELL_W = 30;
			CELL_H = 23;
		}
		resetGame();
	});

	function getRandomLetter() {
		const abc = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
		return abc.charAt(Math.floor(Math.random() * abc.length));
	}

	function createEmptyGrid(): Cell[][] {
		return Array.from({ length: GRID_ROWS }, () =>
			Array.from({ length: GRID_COLS }, () => ({
				letter: getRandomLetter(),
				isCorrect: false,
				isIncorrect: false
			}))
		);
	}

	function insertWords(grid: Cell[][], words: string[]): [Cell[][], Word[]] {
		const newGrid = structuredClone(grid);
		const result: Word[] = [];
		let row = 0;
		while (row < GRID_ROWS) {
			if (Math.random() < 0.7) {
				const word = words[Math.floor(Math.random() * words.length)];
				const col = Math.floor(Math.random() * (GRID_COLS - word.length));
				for (let i = 0; i < word.length; i++) {
					newGrid[row][col + i].letter = word[i].toUpperCase();
				}
				result.push({ value: word, row, col, guessed: false, attempt: 0, time: 60000 });
			}
			row++;
		}
		return [newGrid, result];
	}

	export function resetGame() {
		clearInterval(timerInterval);
		isGameRunning = true;
		timer = 60;
		[grid, generatedWords] = insertWords(createEmptyGrid(), words);

		resetTime();

		timerInterval = setInterval(() => {
			timer--;
			if (timer <= 0 || guessedCount === generatedWords.length) stopGame();
		}, 1000);
	}

	export function stopGame() {
		clearInterval(timerInterval);
		currentSelection = null;
		isGameRunning = false;
		highlightUnguessed();
		gameEnd();

		sendResults({
			results: generatedWords.map((x) => {
				const y = { ...x } as MunsterbergResult;
				y.word = x.value;
				return y;
			}),
			meta: generatedWords.map((x) => x.value)
		});
	}

	function markFoundAndRecordTime(found: Word) {
		found.attempt = guessedCount;
		found.guessed = true;
		found.time = clamp(Math.floor(performance.now() - startTime), 0, 60000);
		resetTime();
	}

	function markNotFound(found: Word, attemp: number): number {
		found.attempt = attemp;
		found.time = Math.floor(performance.now() - startTime);
		return attemp + 1;
	}

	function resetTime() {
		startTime = performance.now();
	}

	function getSelectedWord(grid: Cell[][], sel: Selection): string {
		const from = Math.min(sel.fromCol, sel.toCol);
		const to = Math.max(sel.fromCol, sel.toCol);
		return grid[sel.row]
			.slice(from, to + 1)
			.map((cell) => cell.letter)
			.join('');
	}

	function markCorrect(grid: Cell[][], sel: Selection): void {
		const from = Math.min(sel.fromCol, sel.toCol);
		const to = Math.max(sel.fromCol, sel.toCol);
		for (let j = from; j <= to; j++) grid[sel.row][j].isCorrect = true;
	}

	function markIncorrect(grid: Cell[][], sel: Selection): void {
		const from = Math.min(sel.fromCol, sel.toCol);
		const to = Math.max(sel.fromCol, sel.toCol);
		for (let j = from; j <= to; j++)
			if (!grid[sel.row][j].isCorrect) grid[sel.row][j].isIncorrect = true;
	}

	function clearIncorrect(grid: Cell[][], row: number): void {
		for (let j = 0; j < GRID_COLS; j++) grid[row][j].isIncorrect = false;
	}

	function highlightUnguessed(): void {
		let x = guessedCount;
		generatedWords.forEach((word) => {
			if (!word.guessed) {
				x = markNotFound(word, x);
				for (let j = word.col; j < word.col + word.value.length; j++) {
					grid[word.row][j].isIncorrect = true;
				}
			}
		});
	}

	function getEventSelection(e: TouchEvent | PointerEvent): Selection | null {
		const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
		const j = clamp(Math.floor((x - overlay.offsetLeft) / CELL_W), 0, GRID_COLS - 1);
		const i = clamp(Math.floor((y - overlay.offsetTop) / CELL_H), 0, GRID_ROWS - 1);
		return isNaN(i) || isNaN(j) ? null : { row: i, fromCol: j, toCol: j };
	}

	async function resetCells(sel: Selection) {
		if (isResetting) return;
		isResetting = true;

		const word = getSelectedWord(grid, sel);
		const found = generatedWords.find(
			(w) => !w.guessed && w.row === sel.row && w.value.toLowerCase() === word.toLowerCase()
		);
		if (found) {
			markFoundAndRecordTime(found);
			markCorrect(grid, sel);
		} else {
			markIncorrect(grid, sel);
			await delay(200);
			clearIncorrect(grid, sel.row);
		}
		currentSelection = null;
		isResetting = false;
	}

	function handleInteraction(e: TouchEvent | PointerEvent) {
		if (!isGameRunning || isResetting) return;
		if (e.type === 'touchstart' || e.type === 'pointerdown') {
			isDragging = true;
			currentSelection = getEventSelection(e);

			resetTime();
		} else if ((e.type === 'touchmove' || e.type === 'pointermove') && isDragging) {
			const sel = getEventSelection(e);
			if (sel && currentSelection) {
				currentSelection.toCol = sel.fromCol;
			}
		} else if (e.type === 'touchend' || e.type === 'pointerup' || e.type === 'pointerout') {
			isDragging = false;
			if (currentSelection) resetCells(currentSelection);
		}
	}

	function isSelected(i: number, j: number): boolean {
		if (!currentSelection) return false;
		const { row, fromCol, toCol } = currentSelection;
		const [start, end] = [fromCol, toCol].sort((a, b) => a - b);
		return i === row && j >= start && j <= end;
	}

	onDestroy(() => {
		clearInterval(timerInterval);
	});
</script>

<div
	class="
	pointer-events-auto
	z-0
	box-border
	grid
	cursor-pointer
	touch-none
	border-[1px]
	border-gray-700 select-none
	"
	style="grid-template-columns: repeat({GRID_COLS}, {CELL_W}px); grid-template-rows: repeat({GRID_ROWS}, {CELL_H}px);"
	bind:this={overlay}
	ontouchstart={handleInteraction}
	ontouchmove={handleInteraction}
	ontouchend={handleInteraction}
	onpointerdown={handleInteraction}
	onpointermove={handleInteraction}
	onpointerup={handleInteraction}
	onpointerout={handleInteraction}
>
	{#each grid as row, i}
		{#each row as cell, j}
			<div
				class="
						cell
						pointer-events-none
						relative
						z-[1]
						box-border
						flex
						transform-gpu
						items-center
						justify-center
						border-[1px]
						border-gray-700
						text-center
						transition-all
						duration-300
						select-none
						{isSelected(i, j) ? 'selected z-[2] scale-110 overflow-hidden border-transparent shadow-md' : ''}
						{cell.isCorrect ? 'correct text-gray-50' : ''}
						{cell.isIncorrect ? 'incorrect text-gray-50' : ''}"
			>
				{cell.letter}
			</div>
		{/each}
	{/each}
</div>
{#if isGameRunning}
	<h3>{`0${timer === 60 ? 1 : 0}:${timer % 60 < 10 ? '0' : ''}${timer % 60}`}</h3>
{:else}
	<h3>Вы отгадали {guessedCount}/{generatedWords.length} за {60 - timer} сек.</h3>
{/if}

<svelte:window bind:innerWidth bind:innerHeight />

<style>
	.cell {
		backface-visibility: hidden;
		transform-style: preserve-3d;
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
</style>
