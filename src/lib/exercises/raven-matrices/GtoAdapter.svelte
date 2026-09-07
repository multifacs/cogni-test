<script lang="ts">
	import RavenMatricesGame from './components/RavenMatricesGame.svelte';

	interface Props {
		sendResults: (results: unknown[]) => void;
	}

	let { sendResults }: Props = $props();

	function handleSendResults(results: Record<string, unknown>[]) {
		try {
			sendResults(results);
		} catch (err) {
			console.error('Raven GTO: failed to send results', err);
		}
	}

	function handleGameEnd() {
		// Suppress — GTO handles test advancement via sendResults.
	}
</script>

<RavenMatricesGame gameEnd={handleGameEnd} sendResults={handleSendResults} />
