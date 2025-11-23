<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, Scale, type CoreScaleOptions, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { translate } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';

	import type { CampimetryResult } from './types';
	import type { Result } from '$lib/components/charts/types';

	let {
		testType,
		results
	}: {
		testType: 'campimetry';
		results: CampimetryResult[];
	} = $props();

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	function compareNumbers(a: number, b: number) {
		return a - b;
	}

	function getResults(testType: 'campimetry', results: CampimetryResult[]): Result[] {
		return results
			.map((result) => {
				return {
					x: Math.round((result.attempt - 1) / 2) + 1,
					y: result.freq,
					stage: 2,
					isCorrect: false,
					raw: result
				};
			});
	}

	let parsedResults: Result[];

	onMount(() => {
		parsedResults = getResults(testType, results);
		console.log(parsedResults);

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsedResults.map((el) => el.x).sort(compareNumbers),
				datasets: [
					{
						label: 'Частоты мерцания',
						data: parsedResults,
						borderWidth: 1,
						pointRadius: 5,
						tension: 0.4
					}
				]
			},
			options: {
				onHover: function (event, chartElements) {
					const target = event.native ? event.native.target : event.chart.canvas;
					target.style.cursor = chartElements.length ? 'pointer' : 'default';
				},
				responsive: true,
				plugins: {
					tooltip: {
						callbacks: {
							title: (context) => {
								const value = context[0].raw;
								const raw = value.raw;
								return `Цвет ${value.x}`;
							},
							label: function (context) {
								const value = context.raw;
								const raw = value.raw;
								return `Гц: ${value.y}`;
							}
						}
					},

					legend: {
						labels: {
							usePointStyle: true
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Цвета'
						},
						ticks: {
							maxRotation: 90,
							minRotation: 0,
							callback: (ctx) => translate(parsedResults[ctx].raw.color),
							color: (ctx) => {
								const color = parsedResults[ctx.index].raw.color;
								return getCSSVar(`--camp-${color}`);
							},
							font: {
								weight: 'bold'
							}
						}
					},
					y: {
						title: {
							display: true,
							text: 'Частота, Гц'
						}
					}
				}
			}
		});
	});
	onDestroy(() => {
		// console.log('destroy');
		// chart.destroy();
	});
</script>

<canvas bind:this={canvas}></canvas>
