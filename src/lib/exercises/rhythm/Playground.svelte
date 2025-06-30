<script lang="ts">
	import { onMount } from 'svelte';
	import { RhythmEngine } from './logic/RhythmEngine'; // предполагаем, что ты сохранил его как RhythmEngine.ts
	import Button from '$lib/components/ui/Button.svelte';

	let engine: RhythmEngine;

	let phase = $state<'idle' | 'computer' | 'player' | 'done'>('idle');
	let currentStep = $state(0);
	let autoJump = $state(false);
	let userJump = $state(false);

	let beat: number[] = $state([]);
	let userBeat: number[] = $state([]);

	let intervalHandle: ReturnType<typeof setInterval>;

	const audio = new Audio('/rhythm/sfx_point.mp3');

	const audio1 = new Audio('/rhythm/ding 1.mp3');
	const audio2 = new Audio('/rhythm/ding 2.mp3');
	const audio3 = new Audio('/rhythm/ding 3.mp3');
	const audio4 = new Audio('/rhythm/ding 4.mp3');
	const audios = [audio1, audio2, audio3, audio4];

	function playSound(index: number) {
		// audio.currentTime = 0;
		// audio.play();
		audios[index].play();
	}

	function updateFromEngine() {
		phase = engine.getPhase();
		currentStep = engine.getPosition();
		autoJump = engine.getAutoJump();
		userJump = engine.getUserJump();
		if (autoJump || userJump) {
			playSound(currentStep - 1);
		}

		if (engine.isFinished()) {
			clearInterval(intervalHandle);
			const result = engine.getResults();
			beat = result.beat;
			userBeat = result.userBeat;

			isPassed = engine.isPerfectMatch();
			avgDelay = engine.getAverageReactionDelay();
		}
	}

	// Инициализация RhythmEngine теперь с длиной 6 (0..5), но рабочий ритм будет на 1–4
	function startGame() {
		engine = new RhythmEngine(6, 600);
		engine.startComputerPhase();
		intervalHandle = setInterval(updateFromEngine, 50);
	}

	function handleUserInput() {
		engine?.registerUserJump();
	}

	let isPassed = $state(false);
	let avgDelay = $state<number | null>(null);

	onMount(() => {
		startGame();
		window.addEventListener('keydown', (e) => {
			if (e.code === 'Space') {
				handleUserInput();
			}
		});
	});
</script>

{#if phase === 'computer'}
	<h2>Слушайте ритм</h2>
	<div class="flex w-full flex-col items-center gap-2">
		<button class="playfield" aria-label="Игровое поле">
			<div class="track relative flex h-full w-full flex-col items-center justify-center">
				<div class="h-full w-10/12 pb-3">
					<div
						class="ball auto"
						class:jump={autoJump}
						style:left={`calc(19.5% * ${currentStep} - 20px + 5px)`}
					></div>
				</div>

				<div class="flex w-10/12 items-end justify-between pb-1">
					{#each Array(6) as _, i}
						<div
							class={i === currentStep && i > 0 && i < 5
								? 'active-marker'
								: i === 0 || i === 5
									? 'stop-marker'
									: 'go-marker'}
						></div>
					{/each}
				</div>
			</div>
		</button>
		<p class="text-transparent">Нажмите <kbd>пробел</kbd> или кликните</p>
	</div>
{/if}

{#if phase === 'player'}
	<h2>Повторите ритм</h2>

	<div class="flex w-full flex-col items-center gap-2">
		<button class="playfield" onclick={handleUserInput} aria-label="Игровое поле">
			<div class="track relative flex h-full w-full flex-col items-center justify-center">
				<div class="h-full w-10/12 pb-3">
					<div
						class="ball user"
						class:jump={userJump}
						style:left={`calc(19.5% * ${currentStep} - 20px + 5px)`}
					></div>
				</div>

				<div class="flex w-10/12 items-end justify-between pb-1">
					{#each Array(6) as _, i}
						<div
							class={i === currentStep && i > 0 && i < 5
								? 'active-marker'
								: i === 0 || i === 5
									? 'stop-marker'
									: 'go-marker'}
						></div>
					{/each}
				</div>
			</div>
		</button>
		<p>Нажмите <kbd>пробел</kbd> или кликните</p>
	</div>
{/if}

{#if phase === 'done'}
	<div class="flex flex-col gap-4">
		<h2>Результат</h2>

		<div class="flex flex-col gap-2">
			<p>Оригинал:</p>
			<div class="timeline">
				{#each beat.slice(1, 5) as b}
					<div class="dot" class:jumped={b === 1}>{b === 1 ? '⬆️' : '⚪'}</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<p>Ваш ответ:</p>
			<div class="timeline">
				{#each userBeat.slice(1, 5) as b, i}
					<div class="dot" class:correct={b === beat[i]} class:wrong={b !== beat[i]}>
						{b === 1 ? '⬆️' : '⚪'}
					</div>
				{/each}
			</div>
		</div>

		<p class="text-center text-xl font-bold">
			{isPassed ? 'Тест пройден ✅' : 'Тест не пройден ❌'}
		</p>

		{#if isPassed && avgDelay !== null}
			<p class="text-center text-sm text-gray-300">
				Среднее время реакции: {Math.round(avgDelay)} мс
			</p>
		{/if}
	</div>
{/if}

<style>
	h2 {
		text-align: center;
	}
	.playfield {
		margin: 2rem auto;
		width: 80%;
		height: 100px;
		position: relative;
		border: 2px solid #ccc;
		border-radius: 10px;
		background: #f8f8f8;
		cursor: pointer;
	}
	.ball {
		position: relative;
		top: 40px;
		left: calc(-20px + 5px + 49px * 0);
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: gray;
		transition:
			transform 0.2s ease,
			left 0.2s linear;
	}
	.ball.auto {
		background: #facc15;
	}
	.ball.user {
		background: #60a5fa;
	}
	.jump {
		transform: translateY(-35px);
	}
	.timeline {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.dot {
		font-size: 2rem;
	}
	.correct {
		color: green;
	}
	.wrong {
		color: red;
	}

	.stop-marker {
		width: 10px;
		height: 10px;
		background-color: #e2e2e2;
		border-radius: 50%;
	}
	.go-marker {
		width: 10px;
		height: 10px;
		background-color: #bbb;
		border-radius: 50%;
	}

	.active-marker {
		width: 12px;
		height: 12px;
		background-color: #ff0000;
		border-radius: 50%;
		transition: all 0.2s;
	}
</style>
