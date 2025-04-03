<script lang="ts">
	import Chart from 'chart.js/auto';

	import { Colors } from 'chart.js';
	Chart.register(Colors);

	import type { Result } from './result';
	import { translate } from './translate';
	import { onDestroy, onMount } from 'svelte';

	let {
		stages = 1,
		results,
		xtitle,
		ytitle
	}: {
		stages: number;
		results: Result[];
		xtitle: string;
		ytitle: string;
	} = $props();

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());
	const stageNums: number[] = [];
	for (let i = 1; i <= stages; i++) stageNums.push(i);

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: results.map((el) => el.x),
				datasets: stageNums.map((stage) => {
					return {
						label: translate(`stage ${stage}`),
						data: results.filter((el) => el.stage == stage),
						borderWidth: 1,
						pointBackgroundColor: (ctx) =>
							ctx.raw.isCorrect ? 'rgb(95, 212, 107)' : 'rgb(204, 66, 51)',
						pointRadius: 5,
						tension: 0.4
					};
				})
			},
			options: {
				responsive: true,
				plugins: {
					title: {
						text: 'Результаты',
						display: true
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: xtitle
						}
					},
					y: {
						title: {
							display: true,
							text: ytitle
						}
					}
				}
			}
		});
	});
	onDestroy(() => {
		// console.log('destroy');
		chart.destroy();
	});
</script>

<canvas bind:this={canvas}></canvas>
