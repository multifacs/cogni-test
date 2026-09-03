<script lang="ts">
	import EmojiGame from './EmojiGame.svelte';

	let { gameEnd, sendResults }: { gameEnd: () => void; sendResults: (results) => void } =
		$props();
</script>

<EmojiGame {gameEnd} {sendResults} />
