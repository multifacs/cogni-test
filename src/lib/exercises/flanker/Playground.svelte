<script lang="ts">
	import FlankerGame from './FlankerGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<FlankerGame {gameEnd} {sendResults} />
