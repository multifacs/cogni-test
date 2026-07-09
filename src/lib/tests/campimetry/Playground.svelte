<script lang="ts">
	import { onMount } from 'svelte';
	import { CampimetryGame } from './logic/campimetry-game';
	import { LabColor } from './logic/lab-color.svelte';
	import { error } from '@sveltejs/kit';
	import { shuffle } from '$lib/utils';

	import Button from '$lib/components/ui/Button.svelte';
	let { data, gameEnd, sendResults } = $props();

	console.log(data);

	let isGameRunning = $state(false);
	let showResults = $state(false);

	let game: CampimetryGame = $state(Object());
	let silhouettes: string[] = $state([]);

	let currentSilhouette = $state('swallow');
	let currentBackgroundColor: LabColor = $state(Object());
	let currentSilhouetteColor: LabColor = $state(Object());
	let currentChannel = $state('');
	let currentOp = $state('');

	let currentStage = $state(1);
	let delta = $state(0);

	onMount(async () => {
		console.log(Object.keys(data.silhouettes));
		resetGame();
	});

	export function resetGame() {
		showResults = false;
		currentStage = 1;
		delta = 0;
		game = new CampimetryGame(Object.keys(data.silhouettes));
		isGameRunning = true;
		nextTask();
	}

	function updateState(
		s: string[],
		stage: number,
		silhouette: string,
		color: LabColor,
		channel: 'a' | 'b',
		op: '+' | '-'
	) {
		silhouettes = s; // getSilhouetteChoices(2, currentAnswer)
		currentStage = stage;
		currentSilhouette = silhouette;
		if (stage != 2) {
			currentBackgroundColor = new LabColor(color);
			currentSilhouetteColor = new LabColor(color);
		}
		currentChannel = channel;
		currentOp = op;
	}

	export function stopGame() {
		isGameRunning = false;
		gameEnd();
		sendResults(game.getResults());
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
		if (!isGameRunning || game.isGameOver()) return stopGame();
		game.startNextTask();
		const currentTask = game.getCurrentTask();
		console.log(currentTask);
		updateState(
			getSilhouetteChoices(2, currentTask.silhouette),
			currentTask.stage,
			currentTask.silhouette,
			currentTask.color,
			currentTask.channel,
			currentTask.op
		);
	}

	function handleAnswer() {
		if (!isGameRunning) return;
		console.log('ui stage:', currentStage);

		game.handleAnswer(delta);
		if (currentStage == 1) {
			addRandomToDelta();
		}
		if (currentStage == 2) {
			delta = 0;
		}
		nextTask();
	}

	function addRandomToDelta() {
		const increment = Math.round(Math.random() * 5 + 4);
		delta += increment;
		console.log('added ', increment);
		if (currentChannel == 'a')
			for (let i = 0; i < increment; i++) {
				currentOp == '+' ? currentSilhouetteColor.incA() : currentSilhouetteColor.decA();
			}
		if (currentChannel == 'b')
			for (let i = 0; i < increment; i++) {
				currentOp == '+' ? currentSilhouetteColor.incB() : currentSilhouetteColor.decB();
			}
	}

	function changeColor() {
		if (delta > 0) {
			if (currentChannel == 'a')
				currentOp == '+' ? currentSilhouetteColor.incA() : currentSilhouetteColor.decA();
			if (currentChannel == 'b')
				currentOp == '+' ? currentSilhouetteColor.incB() : currentSilhouetteColor.decB();
		}
		if (currentStage == 1) delta++;
		if (currentStage == 2) delta--;
		console.log(delta);
	}
</script>

{#if isGameRunning}
	<!-- Progress bar -->
	<div class="mx-auto mb-2 h-1.5 w-4/5 max-w-96 overflow-hidden rounded-full bg-gray-200">
		<div
			class="h-full rounded-full bg-blue-500 transition-all duration-300"
			style={`width: ${(game.getCurrentTaskNumber() / game.getTotalTasks()) * 100}%`}
		></div>
	</div>

	<div class="background" style={`background-color: ${currentBackgroundColor.toString()}`}>
		<div
			class="silhouette max-xs:w-16 max-xs:h-16 h-32 w-32 mask-contain"
			style={`
        background-color: ${currentSilhouetteColor.toString()};
        mask-image: url(${data.silhouettes[currentSilhouette]});
        -webkit-mask-image: url(${data.silhouettes[currentSilhouette]});
        `}
		></div>
	</div>
	{#if currentStage == 1}
		<div class="flex justify-center">
			<Button color="green" onclick={changeColor}>Проявить фигуру</Button>
		</div>
	{:else}
		<div class="flex justify-center gap-2">
			<Button color="green" onclick={changeColor}>Скрыть фигуру</Button>
			<Button color="blue" onclick={handleAnswer}>Больше не видно</Button>
		</div>
	{/if}
	<div
		class="silhouette-choices row flex w-4/5 max-w-96 justify-between {currentStage != 1
			? 'invisible'
			: ''}"
	>
		{#each silhouettes as s}
			<button
				aria-label={`${s} button`}
				class="choice-btn max-xs:w-16 max-xs:h-16 h-[100px] w-[100px] cursor-pointer touch-none bg-white mask-contain select-none rounded-xl
					ring-2 ring-transparent hover:ring-gray-400 active:ring-gray-600 transition-[ring-color] duration-150 disabled:opacity-40 disabled:ring-transparent"
				disabled={!delta}
				style={`
                    mask-image: url(${data.silhouettes[s]});
                    -webkit-mask-image: url(${data.silhouettes[s]});
                    `}
				onclick={() => {
					if (s == currentSilhouette) {
						handleAnswer();
					}
				}}
			></button>
		{/each}
	</div>
	<p class="text-center">
		{#if currentStage == 1}
			Изменяйте оттенок, пока силуэт не станет различимым, а затем выберите правильный силуэт.
		{:else}
			Изменяйте оттенок, пока силуэт не перестанет быть виден. Затем нажмите "Больне не
			видно".
		{/if}
	</p>
{:else}
	<div class="flex flex-col items-center gap-4 py-8">
		<svg
			class="h-16 w-16 text-green-600"
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
		<h1 class="text-2xl font-bold">Тест окончен</h1>
		<p class="text-gray-500">Результаты отправлены</p>
	</div>
{/if}

<style>
	.background {
		display: flex;
		justify-content: center;
		align-items: center;
		aspect-ratio: 1 / 1;
		margin: 10px auto;
		border-radius: 1.5rem;
		box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.silhouette {
	}

	.silhouette-choices {
	}

	/* Вертикальная ориентация */
	@media (orientation: portrait) {
		.background {
			width: 70vw;
			height: 70vw;
			border-radius: 1.5rem;
		}
	}

	/* Горизонтальная ориентация */
	@media (orientation: landscape) {
		.background {
			width: 50vh;
			height: 50vh;
		}
	}
</style>
