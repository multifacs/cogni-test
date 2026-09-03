<script lang="ts">
	import NBackStreamGame from './NBackStreamGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results) => void } =
		$props();
</script>

<NBackStreamGame {gameEnd} {sendResults} />
