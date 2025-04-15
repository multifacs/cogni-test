<script lang="ts">
	import Sign from './components/Sign.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { translate } from '$lib/utils/common';
	import { GameState } from './logic/controller.svelte';
	import { onMount } from 'svelte';

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
</script>

<div class="inequality grid grid-cols-[1fr_auto_1fr] items-center gap-5 text-4xl font-bold">
	{#if gameState.getState().isGameRunning}
		{#if gameState.getState().currentLeft == 'stage'}
			<span></span>
			<span
				>{`${translate(`${gameState.getState().currentLeft}`)} ${gameState.getState().currentRight}`}</span
			>
			<span></span>
		{:else}
			<div class="left justify-self-end">
				<span>{gameState.getState().currentLeft}</span>
			</div>
			<div class="sign grid-col">
				<Sign sign={gameState.getState().currentSign}></Sign>
			</div>
			<div class="right justify-self-start">
				<span>{gameState.getState().currentRight}</span>
			</div>
		{/if}
	{:else}
		<span></span>
		<span>Конец теста</span>
		<span></span>
	{/if}
</div>
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
