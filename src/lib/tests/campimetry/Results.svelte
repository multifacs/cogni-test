<script>
	import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
</script>

<ResultsChart
	evaltype="value"
	stages={2}
	results={game.getResults()}
	xtitle="Оттенок"
	ytitle="Отклонение"
></ResultsChart>
