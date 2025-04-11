<script lang="ts">
	import Chart from 'chart.js/auto';

	let chart = $state();

	new Chart(chart, {
		type: 'line',
		data: {
			labels: allResults.map((_, i) => i + 1),
			datasets: [
				{
					label: 'Время ответа (мс)',
					data: allResults.map((r) => r.time),
					borderColor: 'gray',
					borderWidth: 2,
					pointBackgroundColor: (ctx) => {
						const i = ctx.dataIndex;
						return allResults[i].isCorrect ? 'green' : 'red';
					},
					pointRadius: 5,
					tension: 0.3
				}
			]
		},
		options: { responsive: true }
	});
</script>

<canvas bind:this={chart}></canvas>
