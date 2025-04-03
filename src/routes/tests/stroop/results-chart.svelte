<script lang="ts">
	import Chart from 'chart.js/auto';

	import { Colors } from 'chart.js';
	Chart.register(Colors);

	import type { Result } from './stroop-game';
	import { onDestroy, onMount } from 'svelte';
	import { translate } from './utils';
	let { results }: { results: Result[] } = $props();

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: results.map((el) => el.x),
				datasets: [1, 2, 3].map((stage) => {
					return {
						label: translate(`stage ${stage}`),
						data: results
							.filter((el) => el.stage == stage)
							.map((el) => {
								return { x: el.x, y: el.time, answer: el.answer };
							}),
						borderWidth: 1,
						pointBackgroundColor: (ctx) =>
							ctx.raw.answer ? 'rgb(95, 212, 107)' : 'rgb(204, 66, 51)',
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
							text: 'Нажатие'
						}
					},
					y: {
						title: {
							display: true,
							text: 'Время реакции (мс)'
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
