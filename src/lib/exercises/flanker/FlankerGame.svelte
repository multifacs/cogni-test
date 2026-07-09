<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { FlankerTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: FlankerTrialRow[]) => void;
	} = $props();

	const TOTAL_TRIALS = 50;
	const MAX_TEST_SECONDS = 120;

	let testStarted = $state(false);
	let testFinished = $state(false);
	let trials = $state<string[][]>([]);
	let currentTrial = $state<string[] | null>(null);
	let correctAnswers = $state(0);
	let elapsedTime = $state(0);
	let timeLimit = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let layoutKey = $state(0);

	let testStartedAt = 0;
	let trialShownAt = 0;

	let answerLog = $state<FlankerTrialRow[]>([]);

	const trialIndex = $derived(TOTAL_TRIALS - trials.length);

	function arrowSymbol(dir: string) {
		return dir === 'left' ? '←' : '→';
	}

	function isCongruent(trial: string[]) {
		return trial.every((d) => d === trial[2]);
	}

	function generateTrials() {
		const out: string[][] = [];
		for (let i = 0; i < TOTAL_TRIALS; i++) {
			const center = Math.random() < 0.5 ? 'left' : 'right';
			const trial = [center, center, center, center, center];
			const n = Math.floor(Math.random() * 4);
			for (let k = 0; k < n; k++) {
				const j = Math.floor(Math.random() * 4);
				trial[j] = trial[j] === 'left' ? 'right' : 'left';
			}
			out.push(trial);
		}
		return out;
	}

	function stopTimer() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	let elem = $state<HTMLElement>();

	function startTest() {
		testStarted = true;
		testFinished = false;
		timeLimit = false;
		correctAnswers = 0;
		elapsedTime = 0;
		trials = generateTrials();
		currentTrial = trials.shift() ?? null;
		layoutKey++;
		testStartedAt = Date.now();
		trialShownAt = Date.now();
		answerLog = [];
		stopTimer();
		// intervalId = setInterval(() => {
		// 	elapsedTime++;
		// 	if (elapsedTime >= MAX_TEST_SECONDS) {
		// 		timeLimit = true;
		// 		finishTest();
		// 	}
		// }, 1000);
	}

	function answer(dir: string) {
		if (testFinished || !currentTrial) return;
		const reactionTimeMs = Date.now() - trialShownAt;
		const target = currentTrial[2];
		const correct = dir === target;
		if (correct) correctAnswers++;

		answerLog.push({
			trialIndex,
			target,
			selected: dir,
			isCorrect: correct,
			congruent: isCongruent(currentTrial),
			reactionTimeMs,
			timeLimit,
			elapsedTime
		});
		if (trials.length) {
			currentTrial = trials.shift() ?? null;
			layoutKey++;
			trialShownAt = Date.now();
		} else {
			finishTest();
		}
	}

	function finishTest() {
		if (testFinished) return;
		stopTimer();
		testFinished = true;
		currentTrial = null;

		const trialRows: FlankerTrialRow[] = answerLog.map((a, i) => ({
			trialIndex: i + 1,
			target: a.target,
			selected: a.selected,
			isCorrect: a.isCorrect,
			congruent: a.congruent,
			reactionTimeMs: a.reactionTimeMs,
			timeLimit,
			elapsedTime
		}));

		sendResults(trialRows);
		gameEnd();
	}

	function handleKeyDown(e: KeyboardEvent) {
		const input = e.target as HTMLInputElement;
		console.log(e);

		if (e.key == 'ArrowLeft') {
			answer('left');
		}
		if (e.key == 'ArrowRight') {
			answer('right');
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeyDown);
	});
</script>

{#if testStarted && !testFinished && currentTrial}
	<div bind:this={elem} class="flex flex-col items-center justify-center gap-4">
		<div class="grid max-w-4xl grid-cols-[repeat(3,auto)] justify-center gap-4 text-lg">
			<p class=" text-white">
				Время: {elapsedTime} сек
			</p>
			<p class="font-semibold text-[#4caf50]">
				Испытание: {trialIndex} / {TOTAL_TRIALS}
			</p>
			<p class="font-semibold text-[#4caf50]">
				Верно: {correctAnswers}
			</p>
		</div>

		{#key layoutKey}
			<div class="grid grid-cols-5 gap-3">
				{#each currentTrial as dir, index}
					<button
						type="button"
						disabled
						class="h-16 w-16 rounded-2xl bg-gray-100 text-3xl font-bold text-indigo-800"
						>{arrowSymbol(dir)}</button
					>
				{/each}
			</div>
		{/key}

		<div class="flex flex-row flex-wrap items-center justify-center gap-3">
			<Button color="blue" onclick={() => answer('left')}>← Влево</Button>
			<Button id="rightButton" color="orange" onclick={() => answer('right')}>Вправо →</Button
			>
		</div>
	</div>
{:else if testFinished}
	<div class="flex flex-col items-center justify-center gap-3">
		<p class="text-lg font-semibold text-white">Тест завершён</p>
	</div>
{:else}
	<Button color="green" onclick={startTest}>Старт</Button>
{/if}
