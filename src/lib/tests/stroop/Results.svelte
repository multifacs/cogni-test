<script lang="ts">
	import ResultsChart from "$lib/components/charts/ResultsChart.svelte";
</script>

<ResultsChart stages={3} results={game.getResults()} xtitle="Нажатие" ytitle="Время реакции (мс)"
></ResultsChart>