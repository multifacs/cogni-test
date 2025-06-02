<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let audio = new Audio('/rhythm/morse.mp3');

	function playSound() {
		audio.currentTime = 0;
		audio.play();
	}

	let phase: 'listen' | 'repeat' | 'result' = $state('listen');

	let beat: number[] = $state([]); // [0, 1, 0, 1, 0, 0, 1]
	let userBeat: number[] = $state([]); // фиксируется как [0, 1, 0, 0, ...] по времени
	let beatLength = 4;
	let interval = 500; // 500 мс между шагами

	let currentStep = -1;
	let timer: ReturnType<typeof setInterval>;

	const DOT_ON = '🌕';
	const DOT_OFF = '🌑';

	let isLit = $state(false);
	let isPlayingBack = $state(false);

	function generateBeat() {
		beat = Array.from({ length: beatLength }, () => (Math.random() < 0.5 ? 1 : 0));
		console.log('Target beat:', beat);
	}

	function playBeat(onEnd: () => void, source: number[]) {
		let i = 0;
		isPlayingBack = true;
		currentStep = -1;

		timer = setInterval(() => {
			if (i >= source.length) {
				clearInterval(timer);
				isPlayingBack = false;
				onEnd();
				return;
			}
			isLit = source[i] === 1;
			if (isLit) playSound();
			currentStep = i;
			i++;
		}, interval);
	}

	function startListening() {
		phase = 'listen';
		generateBeat();
		playBeat(() => {
			phase = 'repeat';
			currentStep = -1;
			userBeat = [];
			startRecording();
		}, beat);
	}

	let recordingTimer: ReturnType<typeof setInterval>;
	let recordingStep = 0;

	function startRecording() {
		recordingStep = 0;
		recordingTimer = setInterval(() => {
			if (recordingStep >= beatLength) {
				clearInterval(recordingTimer);
				phase = 'result';
				currentStep = -1;
			} else {
				userBeat.push(0);
				recordingStep++;
			}
		}, interval);
	}

	function handleUserClick() {
		if (phase !== 'repeat' || recordingStep <= 0 || recordingStep > beatLength) return;

		userBeat[recordingStep - 1] = 1;
		isLit = true;
		playSound();

		setTimeout(() => {
			isLit = false;
		}, 150);
	}

	onMount(() => {
		startListening();
	});
</script>

{#if phase === 'listen'}
	<h2>Слушайте ритм...</h2>
	<div class="dot" class:is-on={isLit}>{isLit ? DOT_ON : DOT_OFF}</div>
{:else if phase === 'repeat'}
	<h2>Повторите ритм:</h2>
	<div class="dot interactive select-none" on:click={handleUserClick}>
		{isLit ? DOT_ON : DOT_OFF}
	</div>
{:else if phase === 'result'}
	<h2>Результат:</h2>

	<p>Оригинал:</p>
	<div class="timeline">
		{#each beat as step, i}
			<div class="dot small" class:is-on={step === 1}>{step === 1 ? DOT_ON : DOT_OFF}</div>
		{/each}
	</div>

	<p>Ваш ответ:</p>
	<div class="timeline">
		{#each userBeat as step, i}
			<div class="dot small" class:is-on={step === 1}>{step === 1 ? DOT_ON : DOT_OFF}</div>
		{/each}
	</div>

	<Button color="green" onclick={startListening}>Начать заново</Button>
{/if}

<style>
	.dot {
		font-size: 4rem;
		text-align: center;
		margin: 1rem;
		cursor: default;
	}
	.dot.interactive {
		cursor: pointer;
	}
	.dot.small {
		font-size: 2rem;
		display: inline-block;
		margin: 0.2rem;
	}
	.timeline {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.is-on {
		color: var(--color-yellow-300);
	}
</style>
