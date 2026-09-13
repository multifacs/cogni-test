<!--
	Test-only stub game (imported by playground page specs through the
	$lib/tests / $lib/exercises mocks): lets browser specs drive the page
	contract from the DOM — gameEnd() / sendResults() individually, or the
	real-game order (gameEnd first, then sendResults in the same tick).
	Not used by the app.
-->
<script lang="ts">
	let {
		gameEnd,
		sendResults
	}: {
		gameEnd?: () => void;
		sendResults?: (results: unknown) => void | Promise<void>;
	} = $props();

	// Exercises-style MetaResult payload: specs' POST-body assertions rely
	// on this exact shape ({ results, meta }).
	const results = { results: [{ answer: 3, correct: true }], meta: {} };

	function fullRun() {
		gameEnd?.();
		void sendResults?.(results);
	}
</script>

<div data-testid="game-stub">
	<button data-testid="stub-end-only" onclick={() => gameEnd?.()}>stub-end-only</button>
	<button data-testid="stub-send-only" onclick={() => void sendResults?.(results)}>
		stub-send-only
	</button>
	<button data-testid="stub-full-run" onclick={fullRun}>stub-full-run</button>
</div>
