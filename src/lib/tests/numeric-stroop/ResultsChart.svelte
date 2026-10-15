<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import type { NumericStroopResult } from './types';

	let {
		testType,
		results
	}: {
		testType: 'numericStroop';
		results: NumericStroopResult[];
	} = $props();

	type ChartPoint = {
		x: number;
		y: number;
		isCorrect: boolean;
		raw: NumericStroopResult;
	};

	const evalFunc = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as ChartPoint;
		return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'var(--main-text-color)';

	let canvas: HTMLCanvasElement = $state(Object());

	let chart: Chart | undefined;

	let allTime = $state(0);
	let avg = $state(0);
	let accuracy = $state(0);
	let stroopEffect = $state<number | null>(null);

	function average(numbers: number[]): number {
		if (numbers.length === 0) return 0;
		return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
	}

	function getResults(testType: 'numericStroop', results: NumericStroopResult[]): ChartPoint[] {
		return results.map((result) => {
			return {
				x: result.attempt + 1,
				y: result.time,
				isCorrect: result.isCorrect,
				raw: result
			};
		});
	}

	onMount(() => {
		const parsedResults: ChartPoint[] = getResults(testType, results);

		avg = average(parsedResults.map((el) => el.y));
		allTime = Math.round(
			parsedResults.reduce((accumulator, currentValue) => accumulator + currentValue.y, 0) /
				1000
		);
		accuracy =
			parsedResults.length === 0
				? 0
				: Math.round(
						(parsedResults.filter((el) => el.isCorrect).length / parsedResults.length) *
							100
					);

		// Эффект Струпа: среднее время реакции на неконгруэнтных парах
		// минус среднее на конгруэнтных. Пустая подвыборка → нет эффекта.
		const congruentTimes = parsedResults.filter((el) => el.raw.congruent).map((el) => el.y);
		const incongruentTimes = parsedResults.filter((el) => !el.raw.congruent).map((el) => el.y);
		stroopEffect =
			congruentTimes.length > 0 && incongruentTimes.length > 0
				? average(incongruentTimes) - average(congruentTimes)
				: null;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsedResults.map((el) => el.x),
				datasets: [
					{
						label: 'Время реакции',
						data: parsedResults,
						borderWidth: 1,
						pointBackgroundColor: evalFunc,
						pointRadius: 5,
						tension: 0.4
					}
				]
			},
			options: {
				onHover(event, chartElements, chart) {
					const target = event.native?.target as HTMLElement | undefined;
					(target ?? chart.canvas).style.cursor = chartElements.length
						? 'pointer'
						: 'default';
				},
				responsive: true,
				plugins: {
					tooltip: {
						callbacks: {
							title: (context) => {
								const value = context[0].raw as ChartPoint;
								return `Попытка ${value.x}`;
							},
							label: function (context) {
								const value = context.raw as ChartPoint;
								const status = value.isCorrect ? 'Верно' : 'Неверно';
								return `Реакция: ${value.y} мс (${status})`;
							}
						}
					},
					legend: {
						labels: {
							usePointStyle: true,
							generateLabels: (chart) => {
								const original =
									Chart.defaults.plugins.legend.labels.generateLabels(chart);
								const fontColor = original[0]['fontColor'];
								const strokeStyle = original[0]['strokeStyle'];
								return [
									{
										text: 'Среднее время реакции',
										fontColor,
										fillStyle: 'rgba(255,99,132,0.4)',
										strokeStyle: 'rgba(255,99,132,1)',
										pointStyle: 'line' as const,
										lineDash: [6, 6],
										hidden: false,
										index: -1
									},
									{
										text: 'Верно',
										fontColor,
										fillStyle: getCSSVar('--color-green-500'),
										strokeStyle,
										pointStyle: 'circle' as const,
										hidden: false,
										index: -2
									},
									{
										text: 'Неверно',
										fontColor,
										fillStyle: getCSSVar('--color-red-400'),
										strokeStyle,
										pointStyle: 'circle' as const,
										hidden: false,
										index: -3
									}
								];
							}
						}
					},
					annotation: {
						annotations: {
							averageLine: {
								type: 'line',
								yMin: avg,
								yMax: avg,
								borderColor: 'rgba(255,99,132,1)',
								borderWidth: 2,
								borderDash: [6, 6]
							}
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Попытки'
						},
						ticks: {
							maxRotation: 0,
							minRotation: 0,
							color: (ctx) => {
								const point = parsedResults[ctx.index];
								if (!point) return getCSSVar('--main-text-color');
								return getCSSVar(
									point.raw.congruent ? '--color-blue-500' : '--color-red-500'
								);
							},
							font: {
								weight: 'bold'
							}
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
		chart?.destroy();
	});
</script>

<p>Время прохождения теста: {allTime} с</p>
<p class="padding-bottom: 1rem;">Среднее время реакции: {avg} мc</p>
<p>Точность: {accuracy} %</p>
<p>Эффект Струпа: {stroopEffect === null ? '—' : `${stroopEffect} мс`}</p>
<canvas bind:this={canvas}></canvas>
