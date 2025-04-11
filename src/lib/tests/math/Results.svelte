<script lang="ts">
	import { MathGame } from './logic/math-game'; // Adjust the import path as needed
	import ResultsChart from '$lib/components/charts/ResultsChart.svelte';

	// Game logic
	let game: MathGame = $state(Object());
</script>

<ResultsChart stages={1} results={game.getResults()} xtitle="Нажатие" ytitle="Время реакции (мс)"
></ResultsChart>
