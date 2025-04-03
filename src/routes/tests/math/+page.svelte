<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { MathGame } from './math-game'; // Adjust the import path as needed
	import Sign from './sign.svelte';

	import Button from '$lib/components/button.svelte';
	import ResultsChart from '$lib/components/results-chart.svelte';

	import { goto } from '$app/navigation';
	import { translate } from '$lib/components/translate';

	import type { Inequality } from './math-game';

	// Game state
	let currentLeft: string | number = $state('stage');
	let currentSign: string | null = $state('');
	let currentRight: number | null = $state(0);

	let score = 0;
	const DURATION = 3;
	let timeLeft = $state(DURATION);
	let isTestRunning = $state(false);
	let showResults = $state(false);
	let timer: number | null = null;

	// Game logic
	let game: MathGame = $state(Object());

	// Initialize the game
	onMount(() => {});

	function resetGameState() {
		showResults = false;
		game = new MathGame();
		score = 0;
		isTestRunning = true;
		nextTask();
	}

	// Start the test
	async function startTest() {
		resetGameState();
	}

	function updateState(left: string | number, sign: string | null, right: number | null) {
		currentLeft = left;
		currentSign = sign;
		currentRight = right;
		timeLeft = DURATION;
	}

	function stopTest() {
		isTestRunning = false;
		updateState('stage', '', 0);
		clearTimer();
	}

	function startTimer() {
		clearTimer();
		timer = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) {
				clearTimer();
				game.handleAnswer(null);
				nextTask();
			}
		}, 1000);
	}

	function clearTimer() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function nextTask() {
		if (!isTestRunning || game.isGameOver()) return endTest();

		game.startNextTask();
		const { left, sign, right } = game.getCurrentTask();
		updateState(left, sign, right);
		startTimer();
	}

	function handleAnswer(answer: boolean) {
		if (!isTestRunning || currentLeft === 'stage') return;
		clearTimer();

		game.handleAnswer(answer);
		score = game.getResults().filter((x) => x.isCorrect).length;
		nextTask();
	}

	function endTest() {
		isTestRunning = false;
		updateState('stage', '', 0);
		clearTimer();
		showResults = true;
	}
</script>

<h1>Арифметический тест</h1>
{#if !isTestRunning}
	<p>
		Экран разделен пополам на 2 части: слева находится зеленое поле (ДА), справа – красное (НЕТ). По
		середине показывается числовое равенство. Необходимо нажать на красное поле, если числовое
		равенство неверное или на зеленое, если верно.
	</p>
	<p>
		Всего 10 числовых равенств, на определение правильности каждого дается 3 секунды.
	</p>
	<div class="button-container">
		<Button color="green" onclick={startTest}>Начать тест</Button>
		<Button
			color="red"
			onclick={() => {
				goto('/tests');
			}}>Назад</Button
		>
	</div>
{:else}
	<div class="subcontainer">
		<div class="inequality">
			{#if currentLeft == 'stage'}
				<span></span>
				<span>{`${translate(currentLeft)} ${currentRight}`}</span>
				<span></span>
			{:else}
				<div class="left">
					<span>{currentLeft}</span>
				</div>
				<div class="sign">
					<Sign sign={currentSign}></Sign>
				</div>
				<div class="right">
					<span>{currentRight}</span>
				</div>
			{/if}
		</div>
		<div class="color-grid">
			<Button kind="big" color="green" onclick={() => handleAnswer(true)}>ДА</Button>
			<Button kind="big" color="red" onclick={() => handleAnswer(false)}>НЕТ</Button>
		</div>
		<div>Осталось времени: {timeLeft} сек</div>
		<Button color="red" onclick={stopTest}>Стоп</Button>
	</div>
{/if}

{#if showResults}
	<ResultsChart stages={1} results={game.getResults()} xtitle="Нажатие" ytitle="Время реакции (мс)"
	></ResultsChart>
{/if}

<style>
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

	.inequality {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 20px;
		font-size: 30pt;
		font-weight: bolder;
	}

	.sign {
		grid-column: 2;
	}

	.left {
		justify-self: end;
	}

	.right {
		justify-self: start;
	}

	.button-container {
		display: flex;
		gap: 10px; /* Расстояние между кнопками */
		justify-content: center; /* Выравнивание по центру */
		align-items: center; /* Выравнивание по вертикали */
	}
</style>
