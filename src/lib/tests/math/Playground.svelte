<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { GameState } from './logic/controller.svelte';
	import { onDestroy, onMount } from 'svelte';
	import '@fontsource/fira-code';
	import type { MathResult } from './types';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: MathResult[]) => void } = $props();
	// svelte-ignore state_referenced_locally (parent route callbacks are stable function refs; capturing the initial value is intentional)
	let gameState = $state(new GameState(gameEnd, sendResults));

	onMount(() => {
		gameState.resetGame();
	});

	function handleAnswer(answer: boolean) {
		gameState.handleAnswer(answer);
	}
	export function resetGame() {
		console.log('game reset');
		gameState.resetGame();
	}
	export function stopGame() {
		gameState.stopGame();
	}

	onDestroy(() => {
		gameState.clearTimer();
	});

	function getPaddedLeft(left: string | number | null) {
		// if (left) return String(left).padStart(3, ' ');
		if (left || left == 0) return String(left);
		return '';
	}

	function getPaddedRight(right: string | number | null) {
		// if (right) return String(right).padEnd(3, ' ');
		if (right || right == 0) return String(right);
		return '';
	}
</script>

{#if gameState.getState().isGameRunning}
	<div class="flex h-[100dvh] w-full items-center justify-center overflow-hidden p-4">
		<div class="flex h-full max-h-full w-full max-w-md flex-col items-center gap-4 sm:gap-6">
			<!-- Таймер сверху -->
			<div class="w-full">
				<ProgressBar
					min={0}
					max={gameState.DURATION}
					progress={gameState.DURATION - gameState.getState().timeLeft}
				/>
			</div>

			<!-- Контент -->
			{#if gameState.getState().currentLeft === 'stage'}
				<!-- Начальный экран -->
				<div class="flex flex-1 flex-col items-center justify-center gap-3">
					<h2
						class="text-center text-2xl font-bold"
						style="color: var(--main-text-color);"
					>
						Тест сейчас начнётся
					</h2>
					<p class="text-center text-base" style="opacity: 0.7;">
						Приготовьтесь...
					</p>
				</div>
			{:else}
				<!-- Игровое поле с цифрами -->
				<div class="flex flex-1 items-center justify-center">
					<div
						class="inequality grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6"
						style="
							font-family: 'Fira Code', monospace;
							font-size: clamp(2.5rem, 10vh, 5rem);
							font-weight: 700;
							color: var(--main-text-color);
						"
					>
						<div class="justify-self-center">
							{getPaddedLeft(gameState.getState().currentLeft)}
						</div>
						<div class="justify-self-center">
							{gameState.getState().currentSign}
						</div>
						<div class="justify-self-center">
							{getPaddedRight(gameState.getState().currentRight)}
						</div>
					</div>
				</div>
			{/if}

			<!-- Кнопки — только когда игра началась -->
			{#if gameState.getState().currentLeft !== 'stage'}
				<div class="grid w-full grid-cols-2 gap-4">
					<Button
						class="font-bold"
						disabled={!gameState.getState().isGameRunning}
						color="green"
						onclick={() => handleAnswer(true)}
					>
						Верно
					</Button>
					<Button
						class="font-bold"
						disabled={!gameState.getState().isGameRunning}
						color="red"
						onclick={() => handleAnswer(false)}
					>
						Неверно
					</Button>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Финальный экран -->
	<div class="flex h-[100dvh] w-full items-center justify-center p-6">
		<div class="flex flex-col items-center gap-4">
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
			<p class="text-center text-base" style="opacity: 0.6;">
				Результаты отправлены
			</p>
		</div>
	</div>
{/if}