<script lang="ts">
	import { onMount } from 'svelte';
	import { CampimetryGame } from './logic/campimetry-game';
	import { LabColor } from './logic/lab-color.svelte';
	import { error } from '@sveltejs/kit';
	import { shuffle } from '$lib/utils';

	import Button from '$lib/components/ui/Button.svelte';
	import ResultsChart from './ResultsChart.svelte';
	import type { CampimetryResult } from '$lib/tests/campimetry/types';

	let { data } = $props();

	console.log(data);

	let isGameRunning = $state(true);
	let showResults = $state(false);

	let game: CampimetryGame = $state(Object());
	let silhouettes: string[] = $state([]);

	let currentSilhouette = $state('swallow');
	let currentSilhouetteColor: LabColor = $state(Object());
	let currentBGColor: LabColor = $state(Object());

	let visible = $state(true);
	let frequency = $state(1); // Гц
	let intervalId = $state(null);

	let canvas: HTMLCanvasElement | null = $state(null);
	let ctx;

	let canvas2: HTMLCanvasElement | null = $state(null);
	let ctx2;

	let lastSwitch = 0;

	onMount(async () => {
		console.log(Object.keys(data.silhouettes));
		ctx = canvas!.getContext('2d');
		ctx2 = canvas2!.getContext('2d');
		resetGame();
	});

	function drawSquare(size1, size2, ctx, bgColor, color) {
		if (!ctx) return;

		ctx.clearRect(0, 0, size1, size1);
		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, size1, size1);
		ctx.fillStyle = color;
		ctx.fillRect(50, 50, 200, 200);
	}

	function animate(timestamp) {
		// Период одного полного цикла (цвет → черный → цвет)
		const period = 1000 / frequency; // мс на полный цикл
		if (timestamp - lastSwitch >= period / 2) {
			visible = !visible;
			lastSwitch = timestamp;
		}
		drawSquare(
			300,
			50,
			ctx,
			currentBGColor.toString(),
			visible ? currentSilhouetteColor.toString() : currentBGColor.toString()
		);
		drawSquare(
			300,
			50,
			ctx2,
			currentBGColor.toString(),
			visible ? 'black' : currentBGColor.toString()
		);
		requestAnimationFrame(animate);
	}

	export function resetGame() {
		showResults = false;
		game = new CampimetryGame(Object.keys(data.silhouettes));
		isGameRunning = true;
		nextTask();
		requestAnimationFrame(animate);
	}

	function updateState(silhouette: string, color: LabColor, bgColor: LabColor) {
		currentSilhouette = silhouette;
		currentSilhouetteColor = new LabColor(color);
		currentBGColor = new LabColor(bgColor);
	}

	let results: CampimetryResult[] | null = $state(null);

	export function stopGame() {
		isGameRunning = false;
		console.log(game.getResults());
		results = game.getResults();
	}

	function nextTask() {
		if (!isGameRunning || game.isGameOver()) return stopGame();
		game.startNextTask();
		const currentTask = game.getCurrentTask();
		console.log(currentTask);
		updateState(currentTask.silhouette, currentTask.color, currentTask.bgColor);
	}

	function handleAnswer() {
		if (!isGameRunning) return;

		game.handleAnswer(frequency);
		frequency = 1;
		nextTask();
	}

	function changeFreq() {
		frequency += 1; // увеличиваем частоту на 1 Гц
		console.log('Новая частота:', frequency, 'Гц');
	}
</script>

{#if isGameRunning}
	<div class="flex gap-2">
		<canvas id="canvas" width="300" height="300" bind:this={canvas}></canvas>
		<canvas id="canvas2" width="300" height="300" bind:this={canvas2}></canvas>
	</div>
	<div class="flex gap-2">
		<Button color="green" onclick={changeFreq}>Изменить частоту</Button>
		<Button color="blue" onclick={handleAnswer}>Больше не видно</Button>
	</div>
	<p class="text-center">
		Частота: {frequency} Гц
	</p>
	<p class="text-center">
		Цвет фона: {currentBGColor.toString()}, цвет фигуры: {currentSilhouetteColor.toString()}
	</p>
	<p class="text-center">
		Изменяйте частоту мигания, пока мигание не перестанет быть видно. Затем нажмите "Больне не
		видно".
	</p>
{:else}
	<ResultsChart testType="flash-campimetry" results={results!}></ResultsChart>
{/if}

<style>
	.background {
		display: flex;
		justify-content: center;
		align-items: center;
		aspect-ratio: 1 / 1;
		margin: 10px 0;
		background-color: black;
	}

	/* Вертикальная ориентация */
	@media (orientation: portrait) {
		.background {
			width: 70vw;
			height: 70vw;
			/* например, квадрат по ширине */
		}
	}

	/* Горизонтальная ориентация */
	@media (orientation: landscape) {
		.background {
			width: 50vh;
			height: 50vh;
			/* квадрат по высоте */
		}
	}
</style>
