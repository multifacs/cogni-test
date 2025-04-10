<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { CampimetryGame } from './campimetry-game';
	import type { Silhouette } from './campimetry-game';
	import { LabColor } from './lab-color.svelte';
	import { error } from '@sveltejs/kit';
	import { shuffle } from '$lib';

	import Chart from 'chart.js/auto';
	import Button from '$lib/components/button.svelte';
	import { goto } from '$app/navigation';
	import ResultsChart from '$lib/components/results-chart/results-chart.svelte';
	let { data } = $props();

	let isTestRunning = $state(false);
	let showResults = $state(false);

	let game: CampimetryGame = $state(Object());
	let silhouettes: string[] = $state([]);

	let currentAnswer = $state('');
	let currentBackgroundColor: LabColor = $state(Object());
	let currentSilhouetteColor: LabColor = $state(Object());
	let currentChannel = $state('');
	let currentOp = $state('');

	let currentStage = $state(1);
	let delta = $state(0);

	onMount(async () => {
		console.log(Object.keys(data.silhouettes));
	});

	async function startTest() {
		resetGameState();
	}

	function resetGameState() {
		showResults = false;
		currentStage = 1;
		delta = 0;
		game = new CampimetryGame(Object.keys(data.silhouettes));
		isTestRunning = true;
		nextTask();
	}

	function updateState(
		s: string[],
		answer: string,
		color: LabColor,
		channel: 'a' | 'b',
		op: '+' | '-'
	) {
		silhouettes = s; // getSilhouetteChoices(2, currentAnswer)
		currentAnswer = answer;
		currentBackgroundColor = new LabColor(color);
		currentSilhouetteColor = new LabColor(color);
		currentChannel = channel;
		currentOp = op;
	}

	function stopTest() {
		isTestRunning = false;
	}

	function endTest() {
		isTestRunning = false;
		showResults = true;
	}

	function getSilhouetteChoices(num: number, correct: string): string[] {
		if (Object.keys(data.silhouettes).indexOf(correct) == -1) {
			error(500, 'Silhouette not in array');
		}
		let choices = Object.keys(data.silhouettes).filter((x) => x != correct);
		choices = choices.slice(0, num);
		choices.push(correct);
		shuffle(choices);
		return choices;
	}

	function nextTask() {
		if (!isTestRunning || game.isGameOver()) return endTest();
		if (currentStage == 2) return;

		const currentTask = game.getCurrentTask();
		updateState(
			getSilhouetteChoices(2, currentTask.answer),
			currentTask.answer,
			currentTask.color,
			currentTask.channel,
			currentTask.op
		);
	}

	function handleAnswer() {
		if (!isTestRunning) return;
		console.log("ui stage:", currentStage);

		game.handleAnswer(delta);
		currentStage = ((currentStage + 2) % 2) + 1;
		
		if (currentStage == 1) {
			delta = 0;
			nextTask();
		}
		if (currentStage == 2) {
			currentOp = currentOp == '+' ? '-' : '+';
		}
	}
	function changeColor() {
		if (currentChannel == 'a')
			currentOp == '+' ? currentSilhouetteColor.incA() : currentSilhouetteColor.decA();
		if (currentChannel == 'b')
			currentOp == '+' ? currentSilhouetteColor.incB() : currentSilhouetteColor.decB();
		if (currentStage == 1) delta++;
		if (currentStage == 2) delta--;
	}
</script>

<h1>Компьютерная кампиметрия</h1>

{#if !isTestRunning}
	<p class="text">
		<b>Первый этап.</b> На экране отображен фон и чей-то силуэт одного и того же цвета. Необходимо нажимать
		на кнопку «Добавить оттенок», чтобы прибавлять оттенок силуэту. Когда фигурка становится распознаваемой,
		нужно нажать на верный силуэт из предложенных.
	</p>
	<p class="text">
		<b>Второй этап.</b> На экране все тот же фон и тот же силуэт, но уже отклонение от цвета фона определено
		не нажатиями на кнопку «Добавить оттенок», а от программно заданного числа шагов.
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
		<div class="background" style={`background-color: ${currentBackgroundColor.toString()}`}>
			<div
				class="silhouette"
				style={`
				background-color: ${currentSilhouetteColor.toString()};
				mask-image: url(${data.silhouettes[currentAnswer]});
				-webkit-mask-image: url(${data.silhouettes[currentAnswer]});
				`}
			></div>
		</div>
		<Button color="blue" onclick={changeColor}>Изменить оттенок</Button>
		{#if currentStage == 1}
			<div class="row">
				{#each silhouettes as s}
					<button
						aria-label={`${s} button`}
						class="silhouette"
						disabled={!delta}
						style={`
							background-color: white;
							mask-image: url(${data.silhouettes[s]});
							-webkit-mask-image: url(${data.silhouettes[s]});
							`}
						onclick={() => {
							if (s == currentAnswer) {
								handleAnswer();
							}
						}}
					></button>
				{/each}
			</div>
			<p>Изменяйте оттенок, пока силуэт не станет различимым.</p>
		{:else}
			<p>Изменяйте оттенок, пока силуэт не перестанет быть виден.</p>
			<Button color="blue" onclick={handleAnswer}>Больше не видно</Button>
		{/if}

		<div class="button-container">
			<Button color="green" onclick={startTest}>Перезапустить тест</Button>
			<Button color="red" onclick={stopTest}>Стоп</Button>
		</div>
	</div>
{/if}

{#if showResults}
	<ResultsChart evaltype='value' stages={2} results={game.getResults()} xtitle="Оттенок" ytitle="Отклонение"
	></ResultsChart>
{/if}

<style>
	.background {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 300px;
		height: 300px;
		/* background-color: #553131; */
	}

	.silhouette {
		width: 100px;
		height: 100px;
		touch-action: manipulation;
		user-select: none;
		cursor: pointer;
	}

	.row {
		display: flex;
		gap: 20px;
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
