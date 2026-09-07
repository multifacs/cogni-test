<script lang="ts">
	import type { MetaResult } from '../types';
	import AttentionGame from './AttentionGame.svelte';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: MetaResult) => void } = $props();
</script>

<AttentionGame {gameEnd} {sendResults} />
