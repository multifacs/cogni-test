<script lang="ts">
	import RavenMatricesGame from './components/RavenMatricesGame.svelte';

	interface Props {
		gameEnd: () => void;
		sendResults: (results: unknown[]) => void;
		data: Record<string, unknown>;
	}

	let { gameEnd, sendResults, data }: Props = $props();

	// Acknowledge contract props — intentionally not used in this adapter
	void gameEnd;
	void data;

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
