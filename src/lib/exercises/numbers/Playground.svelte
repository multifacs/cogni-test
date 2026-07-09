<script lang="ts">
	import NumbersGame from './NumbersGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<NumbersGame {gameEnd} {sendResults} />
