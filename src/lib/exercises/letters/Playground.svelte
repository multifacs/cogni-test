<script lang="ts">
	import LettersGame from './LettersGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<LettersGame {gameEnd} {sendResults} />
