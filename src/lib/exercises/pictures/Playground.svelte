<script lang="ts">
	import PicturesGame from './PicturesGame.svelte';
	import type { PicturesTrialRow } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: PicturesTrialRow[]) => void;
	} = $props();
</script>

<PicturesGame {gameEnd} {sendResults} />
