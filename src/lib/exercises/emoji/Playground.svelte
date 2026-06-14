<script lang="ts">
	import EmojiGame from './EmojiGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results: any[]) => void } =
		$props();
</script>

<EmojiGame {gameEnd} {sendResults} />
