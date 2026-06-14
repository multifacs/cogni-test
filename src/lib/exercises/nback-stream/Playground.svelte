<script lang="ts">
	import NBackStreamGame from './NBackStreamGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<NBackStreamGame {gameEnd} {sendResults} />
