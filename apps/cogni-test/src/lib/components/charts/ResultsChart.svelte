<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import type { Result } from './types';
	import { translate } from '../../utils/common';
	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import type { TestResultMap } from '$lib/tests/types';

	let {
		testType,
		results
	}: {
		testType: keyof TestResultMap;
		results: TestResultMap[typeof testType][];
	} = $props();

	type EvalType = 'correctness' | 'value';
	type EvalFunction = (ctx: ScriptableContext<'line'>) => string;
	type EvalObject = {
		[key in EvalType]: EvalFunction;
	};
	const evalFuncs: EvalObject = {
		correctness: (ctx: ScriptableContext<'line'>) => {
			const result = ctx.raw as Result;
			return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
		},
		value: (ctx: ScriptableContext<'line'>) => {
			const result = ctx.raw as Result;
			return result.y == 0
				? getCSSVar('--color-green-500')
				: result.y > 0
					? getCSSVar('--color-red-400')
					: getCSSVar('--color-sky-400');
		}
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	let maxStage = Math.max(...results.map((item) => item.stage));
	if (!maxStage || maxStage == 1) maxStage = 0;

	if (testType == 'campimetry') maxStage = 0;

	let stageNums: number[] = [];
	for (let i = 1; i <= maxStage; i++) stageNums.push(i);
	if (!maxStage) stageNums = [0];

	function compareNumbers(a: number, b: number) {
		return a - b;
	}

	function getResults(
		testType: keyof TestResultMap,
		results: TestResultMap[typeof testType][]
	): Result[] {
		console.log(results);
		if (testType == 'stroop') {
			return results.map((result) => {
				return {
					x: result.attempt + 1,
					y: result.time,
					stage: result.stage,
					isCorrect: result.isCorrect,
					raw: result
				};
			});
		}
		if (testType == 'math' || testType == 'swallow' || testType == 'memory') {
			return results.map((result) => {
				return {
					x: result.attempt + 1,
					y: result.time,
					stage: 0,
					isCorrect: result.isCorrect,
					raw: result
				};
			});
		}
		if (testType == 'munsterberg') {
			return results.map((result) => {
				return {
					x: result.attempt + 1,
					y: result.time,
					stage: 0,
					isCorrect: result.guessed,
					raw: result
				};
			});
		}

		if (testType == 'campimetry') {
			return results
				.filter((x) => x.stage == 2)
				.map((result) => {
					return {
						x: Math.round((result.attempt - 1) / 2) + 1,
						y: result.delta,
						stage: 0,
						isCorrect: false,
						raw: result
					};
				});
		}
		return [];
	}

	let avg = $state(0);
	let allTime = $state(0);

	onMount(() => {
		const parsedResults = getResults(testType, results);
		console.log(parsedResults);
		avg = Math.round(
			parsedResults.reduce((accumulator, currentValue) => accumulator + currentValue.y, 0) /
				parsedResults.length
		);
		console.log(avg);

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsedResults.map((el) => el.x).sort(compareNumbers),
				datasets: stageNums.map((stage) => {
					const data = parsedResults.filter((el) => el.stage == stage);
					allTime += data.reduce((a, b) => a + b.y, 0);
					return {
						label: translate(`stage ${stage}`),
						data,
						borderWidth: 1,
						pointBackgroundColor:
							testType == 'campimetry' ? evalFuncs['value'] : evalFuncs['correctness'],
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
					// title: {
					// 	text: 'Результаты',
					// 	display: true
					// },
					tooltip: {
						callbacks: {
							title: (context) => {
								const value = context[0].raw;
								const raw = value.raw;
								if (testType == 'math') {
									return `${raw.left} ${raw.sign} ${raw.right}`;
								}
								return `Попытка ${value.x}`;
							},
							afterTitle: (context) => {
								const value = context[0].raw;
								const raw = value.raw;
								if (testType == 'math') {
									return `Ответ: ${raw.userAnswer ? 'да' : 'нет'}`;
								}
								return '';
							},
							label: function (context) {
								const value = context.raw;
								const raw = value.raw;
								const isCorrect = value.isCorrect;
								const status = isCorrect ? 'Верно' : 'Неверно';
								return `Реакция: ${value.y} мс (${status})`;
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
										text: `Средне время реакции`,
										fontColor,
										fillStyle: 'rgba(255,99,132,0.4)',
										strokeStyle: 'rgba(255,99,132,1)',
										pointStyle: 'line',
										lineDash: [6, 6],
										hidden: false,
										index: -1
									},
									{
										text: 'Верно',
										fontColor,
										fillStyle: getCSSVar('--color-green-500'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -1
									},
									{
										text: 'Неверно',
										fontColor,
										fillStyle: getCSSVar('--color-red-400'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -2
									}
								);

								return newLabels;
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
								// label: {
								// 	display: true,
								// 	content: avg,
								// 	position: 'end'
								// }
							}
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Попытки'
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

		allTime = Math.round(allTime / 1000);
	});
	onDestroy(() => {
		// console.log('destroy');
		// chart.destroy();
	});
</script>

<p>Время прохождения теста: {allTime} с</p>
<p>Среднее время реакции: {avg} мc</p>
<canvas bind:this={canvas}></canvas>
