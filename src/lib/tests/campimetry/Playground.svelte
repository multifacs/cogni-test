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
	<div class="background" style={`background-color: ${currentBackgroundColor.toString()}`}>
		<div
			class="max-xs:w-16 max-xs:h-16 h-32 w-32 mask-contain"
			style={`
        background-color: ${currentSilhouetteColor.toString()};
        mask-image: url(${data.silhouettes[currentSilhouette]});
        -webkit-mask-image: url(${data.silhouettes[currentSilhouette]});
        `}
		></div>
	</div>
	<div class="flex gap-2">
		<Button color="green" onclick={changeColor}>{currentStage == 1 ? 'Проявить фигуру' : 'Скрыть фигуру'}</Button>
		{#if currentStage == 2}
			<Button color="blue" onclick={handleAnswer}>Больше не видно</Button>
		{/if}
	</div>
	{#if currentStage == 1}
		<div class="row flex w-4/5 max-w-96 justify-between">
			{#each silhouettes as s}
				<button
					aria-label={`${s} button`}
					class="max-xs:w-16 max-xs:h-16 h-[100px] w-[100px] cursor-pointer touch-none bg-white mask-contain select-none"
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
			Изменяйте оттенок, пока силуэт не станет различимым, а затем выберите правильный силуэт.
		</p>
	{:else}
		<p class="text-center">Изменяйте оттенок, пока силуэт не перестанет быть виден. Затем нажмите "Больне не видно".</p>
	{/if}
{:else}
	<h1>Тест окончен</h1>
{/if}

<style>
.background {
	display: flex;
	justify-content: center;
	align-items: center;
	aspect-ratio: 1 / 1;
	margin: 10px 0;
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
