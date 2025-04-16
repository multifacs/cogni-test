<script lang="ts">
	import Sign from './components/Sign.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { translate } from '$lib/utils/common';
	import { GameState } from './logic/controller.svelte';
	import { onDestroy, onMount } from 'svelte';
	import '@fontsource/fira-code';

	let { gameEnd, sendResults } = $props();
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
	{#if gameState.getState().currentLeft == 'stage'}
		<h1>Тест начинается</h1>
	{:else}
		<div
			class="inequality grid grid-cols-[1fr_auto_1fr] items-center gap-5 text-4xl font-bold text-gray-50"
		>
			<div class="left justify-self-center">
				{getPaddedLeft(gameState.getState().currentLeft)}
			</div>
			<div class="sign grid-col justify-self-center">
				{gameState.getState().currentSign}
			</div>
			<div class="right justify-self-center">
				<span>{getPaddedRight(gameState.getState().currentRight)}</span>
			</div>
		</div>
	{/if}
{:else}
	<h1>Конец теста</h1>
{/if}

<div class="grid grid-cols-2 gap-2.5">
	<Button
		disabled={!gameState.getState().isGameRunning}
		kind="big"
		color="green"
		onclick={() => handleAnswer(true)}>ДА</Button
	>
	<Button
		disabled={!gameState.getState().isGameRunning}
		kind="big"
		color="red"
		onclick={() => handleAnswer(false)}>НЕТ</Button
	>
</div>
{#if gameState.getState().isGameRunning}
	<div>Осталось времени: {gameState.getState().timeLeft} сек</div>
{/if}

<style>
	.inequality {
		font-family: 'Fira Code';
	}
</style>
