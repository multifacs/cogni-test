<script lang="ts">
	import EmojiGame from './EmojiGame.svelte';
	import type { EmojiTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: { gameEnd: () => void; sendResults: (results: EmojiTrialRow[]) => void } = $props();
</script>

<EmojiGame {gameEnd} {sendResults} />
