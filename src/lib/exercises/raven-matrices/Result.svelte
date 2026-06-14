<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { RavenFullResult } from './types';
	import type { ExerciseResults } from '$lib/exercises/types';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	function reconstructFullResult(attempt_raw: Record<string, unknown>): RavenFullResult {
		const a = attempt_raw as any;
		return {
			totalQuestions: a.totalQuestions,
			correctCount: a.correctCount,
			accuracy: a.accuracy / 100,
			totalDurationMs: a.totalDurationMs,
			averageResponseTimeMs: a.averageResponseTimeMs,
			answers: []
		};
	}
</script>

{#each results as attempt_raw, i (i)}
	{@const fullResult = reconstructFullResult(attempt_raw as Record<string, unknown>)}
	<ResultsChart result={fullResult} />
{/each}
