<script lang="ts">
	import PicturesGame from './PicturesGame.svelte';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: any[]) => void;
	} = $props();
</script>

<PicturesGame {gameEnd} {sendResults} />
