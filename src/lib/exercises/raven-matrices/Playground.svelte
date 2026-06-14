<script lang="ts">
	import RavenMatricesGame from './RavenMatricesGame.svelte';
	import type { RavenAnswerRecord } from './types';

	let { gameEnd }: { gameEnd: () => void } = $props();

	async function handleGameSendResults(
		summary: Record<string, unknown>[],
		answers: RavenAnswerRecord[]
	) {
		await fetch('/exercises/raven-matrices/playground', {
			method: 'POST',
			body: JSON.stringify({ summary: summary[0], answers }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<RavenMatricesGame {gameEnd} sendResults={handleGameSendResults} />
