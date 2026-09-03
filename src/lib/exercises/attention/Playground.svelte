<script lang="ts">
	import AttentionGame from './AttentionGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results) => void } =
		$props();
</script>

<AttentionGame {gameEnd} {sendResults} />
