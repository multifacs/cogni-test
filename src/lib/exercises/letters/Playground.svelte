<script lang="ts">
	import LettersGame from './LettersGame.svelte';
	import type { LettersTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: LettersTrialRow[]) => void } = $props();
</script>

<LettersGame {gameEnd} {sendResults} />
