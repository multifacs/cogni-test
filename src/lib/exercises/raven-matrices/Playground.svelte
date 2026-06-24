<script lang="ts">
	import RavenMatricesGame from './components/RavenMatricesGame.svelte';

	let { gameEnd }: { gameEnd: () => void } = $props();

	async function handleGameSendResults(results: Record<string, unknown>[]) {
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
