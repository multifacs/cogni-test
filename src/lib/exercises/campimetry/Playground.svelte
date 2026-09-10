<script lang="ts">
	import TestsPlayground from '$lib/tests/campimetry/Playground.svelte';
	import type { CampimetryResult } from '$lib/tests/campimetry/types';

	let {
		data,
		gameEnd,
		sendResults
	}: {
		data: { silhouettes: Record<string, string> };
		gameEnd: () => void;
		sendResults?: (results: CampimetryResult[]) => void;
	} = $props();
</script>

<!--
	Exercise mode: reuse the tests playground UI, but with the full color palette
	(one task pair per color) instead of the random ~60% subset used in test mode.
-->
<TestsPlayground {data} {gameEnd} {sendResults} fullPalette={true} />
