<script lang="ts">
	import LettersGame from './LettersGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results) => void } =
		$props();
</script>

<LettersGame {gameEnd} {sendResults} />
