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

	let lastSwitch = 0;

	onMount(async () => {
		console.log(Object.keys(data.silhouettes));
		ctx = canvas!.getContext('2d');
		resetGame();
	});

	function drawSquare(bgColor, color) {
		if (!canvas || !ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
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
			currentBGColor.toString(),
			visible ? currentSilhouetteColor.toString() : currentBGColor.toString()
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
	<canvas id="canvas" width="300" height="300" bind:this={canvas}></canvas>
	<div class="flex gap-2">
		<Button color="green" onclick={changeFreq}>Изменить частоту</Button>
		<Button color="blue" onclick={handleAnswer}>Больше не видно</Button>
	</div>
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
