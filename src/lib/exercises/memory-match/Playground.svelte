<script lang="ts">
	import MemoryMatchGame from './MemoryMatchGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<MemoryMatchGame {gameEnd} {sendResults} />
