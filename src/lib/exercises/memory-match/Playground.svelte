<script lang="ts">
	import MemoryMatchGame from './MemoryMatchGame.svelte';
	import type { MemoryMatchSummaryRow } from './types';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: MemoryMatchSummaryRow[]) => void } = $props();
</script>

<MemoryMatchGame {gameEnd} {sendResults} />
