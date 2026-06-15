<script lang="ts">
	import ResultsChart from './ResultsChart.svelte';
	import type { ExerciseResults } from '$lib/exercises/types';
	import type { RavenAttemptRow } from './results-adapter';

	let { results }: { results: ExerciseResults; exerciseType?: string; meta?: string[] } =
		$props();

	function toAttemptRows(attempts_raw: Record<string, unknown>[]): RavenAttemptRow[] {
		return attempts_raw.map((a) => ({
			taskId: String(a.taskId ?? ''),
			taskIndex: Number(a.taskIndex ?? 0),
			taskClass: String(a.taskClass ?? '') as RavenAttemptRow['taskClass'],
			difficultyLevel: Number(a.difficultyLevel ?? 0),
			difficultyScore: Number(a.difficultyScore ?? 0),
			rules: String(a.rules ?? '[]'),
			skillTags: String(a.skillTags ?? '[]'),
			selectedIndex: a.selectedIndex != null ? Number(a.selectedIndex) : null,
			correctIndex: Number(a.correctIndex ?? 0),
			selectedFamily: a.selectedFamily != null ? String(a.selectedFamily) : null,
			isCorrect: Boolean(a.isCorrect),
			responseTimeMs: Number(a.responseTimeMs ?? 0),
			seed: String(a.seed ?? '')
		}));
	}
</script>

{#each results as session_raw, i (i)}
	{@const session = session_raw as Record<string, unknown>}
	{@const attempts = (session.attempts ?? []) as Record<string, unknown>[]}
	{@const rows = toAttemptRows(attempts)}
	<ResultsChart attempts={rows} />
{/each}
