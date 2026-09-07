<script lang="ts">
	import NBackStreamGame from './NBackStreamGame.svelte';
	import type { NBackTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: NBackTrialRow[]) => void } = $props();
</script>

<NBackStreamGame {gameEnd} {sendResults} />
