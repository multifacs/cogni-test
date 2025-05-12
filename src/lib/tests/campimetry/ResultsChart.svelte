<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
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

	let MOOD: '' | 'Радость' | 'Благодушие' | 'Гнев' | 'Печаль' | 'Тревожность' | 'Дискомфорт' = $state('');

	const evalFunc = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as Result;
		return result.y == 0
			? getCSSVar('--color-green-500')
			: result.y > 0
				? getCSSVar('--color-red-400')
				: getCSSVar('--color-sky-400');
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	const stageNums: number[] = [2];

	function compareNumbers(a: number, b: number) {
		return a - b;
	}

	function getResults(testType: 'campimetry', results: CampimetryResult[]): Result[] {
		return results
			.filter((x) => x.stage == 2)
			.map((result) => {
				return {
					x: Math.round((result.attempt - 1) / 2) + 1,
					y: result.delta,
					stage: 2,
					isCorrect: false,
					raw: result
				};
			});
	}

	const allTime = Math.round(results.reduce((a, b) => a + b.time, 0) / 1000);
	const avg = Math.round(((results.reduce((a, b) => a + b.time, 0) / results.length) * 2) / 1000);

	let parsedResults: Result[];

	function calculateMood(results: CampimetryResult[]) {
		const data = [
			{
				colors: ['dark-red', 'light-red'],
				delta: 0
			},
			{
				colors: ['dark-green', 'light-green'],
				delta: 0
			},
			{
				colors: ['dark-blue', 'light-blue'],
				delta: 0
			}
		];

		data.forEach((x) => {
			const filtered = results.filter((y) => x.colors.includes(y.color));
			x.delta = filtered[0].delta + filtered[1].delta;
		});

		console.log(data.map((x) => x.delta));

		if (data[0].delta <= data[1].delta && data[1].delta <= data[2].delta) {
			console.log(true);
			MOOD = 'Радость';
		} else if (data[1].delta <= data[0].delta && data[0].delta <= data[2].delta) {
			console.log(true);
			MOOD = 'Благодушие';
		} else if (data[0].delta <= data[2].delta && data[2].delta <= data[1].delta) {
			console.log(true);
			MOOD = 'Гнев';
		} else if (data[2].delta <= data[1].delta && data[1].delta <= data[0].delta) {
			console.log(true);
			MOOD = 'Печаль';
		} else if (data[1].delta <= data[2].delta && data[2].delta <= data[0].delta) {
			console.log(true);
			MOOD = 'Тревожность';
		} else if (data[2].delta <= data[0].delta && data[0].delta <= data[1].delta) {
			console.log(true);
			MOOD = 'Дискомфорт';
		}
	}

	onMount(() => {
		parsedResults = getResults(testType, results);
		console.log(parsedResults);

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsedResults.map((el) => el.x).sort(compareNumbers),
				datasets: stageNums.map((stage) => {
					const data = parsedResults.filter((el) => el.stage == stage);
					return {
						label: translate(`stage ${stage}`),
						data,
						borderWidth: 1,
						pointBackgroundColor: evalFunc,
						pointRadius: 5,
						tension: 0.4
					};
				})
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
								return `Отклонение: ${value.y}`;
							}
						}
					},

					legend: {
						labels: {
							usePointStyle: true,
							generateLabels: (chart) => {
								const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
								console.log(Chart.defaults.plugins.legend.labels.generateLabels(chart));
								const fontColor = original[0]['fontColor'];
								const strokeStyle = original[0]['strokeStyle'];
								const newLabels = [];
								// Добавляем вручную легенду для средней линии
								newLabels.push(
									{
										text: 'Недостаточно нажатий',
										fontColor,
										fillStyle: getCSSVar('--color-red-400'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -1
									},
									{
										text: 'Точное совпадение',
										fontColor,
										fillStyle: getCSSVar('--color-green-500'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -1
									},
									{
										text: 'Слишком много нажатий',
										fontColor,
										fillStyle: getCSSVar('--color-sky-400'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -2
									}
								);

								return newLabels;
							}
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
							maxRotation: 0,
							minRotation: 0,
							callback: () => '◼',
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
							text: 'Отклонение'
						}
					}
				}
			}
		});

		calculateMood(results);
		console.log(MOOD)
	});
	onDestroy(() => {
		// console.log('destroy');
		// chart.destroy();
	});
</script>

<p>Время прохождения теста: {allTime} с</p>
<p>Среднее время на один цвет: {avg} с</p>
<canvas bind:this={canvas}></canvas>
<p>Ваше настроение: {MOOD}</p>
