<script lang="ts">
	import NumbersGame from './NumbersGame.svelte';
	import type { NumbersTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: NumbersTrialRow[]) => void } = $props();
</script>

<NumbersGame {gameEnd} {sendResults} />
