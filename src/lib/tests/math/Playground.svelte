<script lang="ts">
	import Sign from './components/Sign.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { translate } from '$lib/utils/common';
	import { GameState } from './logic/controller.svelte';

	let { gameEnd } = $props();
	let gameState = $state(new GameState(gameEnd));

	function handleAnswer(answer: boolean) {
		gameState.handleAnswer(answer);
	}
	export function resetGame() {
		gameState.resetGame();
	}
	export function stopGame() {
		gameState.stopGame();
	}
</script>

<div class="inequality grid grid-cols-[1fr_auto_1fr] items-center gap-5 text-4xl font-bold">
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
</div>
<div class="grid grid-cols-2 gap-2.5">
	<Button kind="big" color="green" onclick={() => handleAnswer(true)}>ДА</Button>
	<Button kind="big" color="red" onclick={() => handleAnswer(false)}>НЕТ</Button>
</div>
<div>Осталось времени: {gameState.getState().timeLeft} сек</div>
