<script lang="ts">
	import RavenMatricesGame from './components/RavenMatricesGame.svelte';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults?: (results: Record<string, unknown>[]) => void;
	} = $props();

	async function handleGameSendResults(results: Record<string, unknown>[]) {
		// If parent provided sendResults (e.g. GTO mode), use it
		if (sendResults) {
			sendResults(results);
			return;
		}
		// Standalone mode: POST to own endpoint
		await fetch('/exercises/raven-matrices/playground', {
			method: 'POST',
			body: JSON.stringify({ results }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<RavenMatricesGame {gameEnd} sendResults={handleGameSendResults} />
