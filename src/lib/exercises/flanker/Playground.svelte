<script lang="ts">
	import FlankerGame from './FlankerGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results) => void } =
		$props();
</script>

<FlankerGame {gameEnd} {sendResults} />
