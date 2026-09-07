<script lang="ts">
	import FlankerGame from './FlankerGame.svelte';
	import type { FlankerTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: FlankerTrialRow[]) => void } = $props();
</script>

<FlankerGame {gameEnd} {sendResults} />
