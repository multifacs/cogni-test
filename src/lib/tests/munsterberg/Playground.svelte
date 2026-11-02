<script lang="ts">
	import { clamp, delay } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import type { Cell, Word, Selection, MunsterbergResult } from './types';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

	let { data, gameEnd, sendResults } = $props();

	const GRID_COLS = 9;
	const GRID_ROWS = 11;

	const BORDER_PX = 1;
	const TOTAL_BORDER_W = (GRID_COLS + 1) * BORDER_PX;

	let CELL_W = $state(42);
	let CELL_H = $state(42);

	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let isGameRunning = $state(false);
	let timer = $state(60);
	let timerInterval = $state<ReturnType<typeof setInterval> | undefined>(undefined);

	let grid: Cell[][] = $state([]);
	let words: string[] = $state([]);
	let generatedWords: Word[] = $state([]);
	let guessedCount = $derived(generatedWords.filter((w) => w.guessed).length);

	let overlay: HTMLElement;
	let currentSelection: Selection | null = $state(null);
	let isDragging = false;
	let isResetting = false;

	let startTime: number = $state(0);

	onMount(() => {
		words = data.words;
		resetGame();
	});

	function recalcCellSize() {
		const parent = overlay.parentElement;
		let availableW: number;
		if (parent) {
			const cs = getComputedStyle(parent);
			availableW =
				parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
		} else {
			availableW = innerWidth;
		}
		const main = overlay.closest('main, .main') as HTMLElement | null;
		let availableH: number;
		if (main) {
			const cs = getComputedStyle(main);
			const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
			availableH = main.clientHeight - padY;
		} else {
			availableH = innerHeight;
		}
		// Reserve space for the ProgressBar + heading
		availableH -= 90;
		const desktopW = 42;
		const cellRatio = 0.85;
		const TOTAL_BORDER_H = (GRID_ROWS + 1) * BORDER_PX;
		const wByWidth = Math.floor((availableW - TOTAL_BORDER_W) / GRID_COLS);
		const wByHeight = Math.floor((availableH - TOTAL_BORDER_H) / GRID_ROWS / cellRatio);
		const calculatedW = Math.min(wByWidth, wByHeight);
		CELL_W = Math.min(Math.max(calculatedW, 14), desktopW);
		CELL_H = CELL_W >= desktopW ? desktopW : Math.floor(CELL_W * 0.85);
	}

	$effect(() => {
		if (innerWidth > 0) recalcCellSize();
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
				const { value, ...rest } = x;
				const result: MunsterbergResult = { ...rest, word: value };
				return result;
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
		found.time = clamp(Math.floor(performance.now() - startTime), 0, 60000);
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
		const rect = overlay.getBoundingClientRect();
		const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
		const j = clamp(Math.floor((x - rect.left) / CELL_W), 0, GRID_COLS - 1);
		const i = clamp(Math.floor((y - rect.top) / CELL_H), 0, GRID_ROWS - 1);
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

{#if isGameRunning}
	<div class="mb-3 flex w-full max-w-md flex-col items-center gap-2">
		<ProgressBar min={0} max={60} progress={60 - timer} />
		<div class="flex w-full items-center justify-between gap-3">
			<p class="text-sm sm:text-base" style="color: var(--main-text-color);">
				Найдите слова
			</p>
			<p class="text-sm font-bold sm:text-base" style="color: var(--button-green-text);">
				{guessedCount} / {generatedWords.length}
			</p>
		</div>
	</div>
{:else}
	<div class="mb-3 flex flex-col items-center gap-4 py-4">
		<svg
			class="h-16 w-16"
			style="color: var(--button-green);"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<h1 class="text-center text-2xl font-bold">Тест окончен</h1>
		<p class="text-center text-base" style="opacity: 0.7;">
			Вы отгадали {guessedCount}/{generatedWords.length} за {60 - timer} сек.
		</p>
	</div>
{/if}

<button
	class="pointer-events-auto z-0 box-border grid cursor-pointer touch-none select-none"
	style="
		grid-template-columns: repeat({GRID_COLS}, {CELL_W}px);
		grid-template-rows: repeat({GRID_ROWS}, {CELL_H}px);
		border: 1px solid var(--input-bg-color);
		border-radius: 0.75rem;
		overflow: hidden;
		background-color: #ffffff;
		margin: 0 auto;
	"
	bind:this={overlay}
	ontouchstart={handleInteraction}
	ontouchmove={handleInteraction}
	ontouchend={handleInteraction}
	onpointerdown={handleInteraction}
	onpointermove={handleInteraction}
	onpointerup={handleInteraction}
	onpointerout={handleInteraction}
>
	{#each grid as row, i (i)}
		{#each row as cell, j (j)}
			<div
				class="
					cell
					pointer-events-none
					relative
					z-1
					box-border
					flex
					transform-gpu
					touch-none
					items-center
					justify-center
					border
					text-center
					transition-all
					duration-300
					select-none
					{isSelected(i, j) ? 'selected z-2 overflow-hidden border-transparent shadow-md' : ''}
					{cell.isCorrect ? 'correct text-black' : ''}
					{cell.isIncorrect ? 'incorrect text-black' : ''}
				"
				style="border-color: var(--input-bg-color);"
			>
				{cell.letter}
			</div>
		{/each}
	{/each}
</button>

<svelte:window bind:innerWidth bind:innerHeight />

<style>
	.cell {
		backface-visibility: hidden;
		transform-style: preserve-3d;
	}
	.selected {
		background-color: var(--button-blue);
		color: var(--button-blue-text);
	}
	.correct {
		background-color: var(--button-green);
		color: var(--button-green-text);
	}
	.incorrect {
		background-color: var(--button-red);
		color: var(--button-red-text);
	}
</style>