<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import { formatMs, summary, type AttentionTrialRow } from './results-adapter';

	type ChartPoint = {
		x: number;
		y: number;
		number: number;
		isTarget: boolean;
		isCorrect: boolean;
		raw: AttentionTrialRow;
	};

	let { clicks }: { clicks: AttentionTrialRow[] } = $props();

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as ChartPoint | undefined;
		if (!result) return 'white';
		if (result.isTarget && result.isCorrect) return getCSSVar('--color-green-500');
		if (!result.isCorrect) return getCSSVar('--color-red-400');
		return 'gray';
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	let avg = $state(0);

	function getResults(trials: AttentionTrialRow[]): ChartPoint[] {
		return trials.map((t, i) => ({
			x: t.clickIndex,
			y: t.reactionTimeMs,
			number: t.number,
			isTarget: t.isTarget,
			isCorrect: t.isCorrect,
			raw: t
		}));
	}

	onMount(() => {
		const parsed = getResults(clicks);
		const s = summary(clicks);

		avg = s.averageResponseTimeMs;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsed.map((r) => r.x),
				datasets: [
					{
						label: 'Время реакции',
						data: parsed,
						borderWidth: 1,
						pointBackgroundColor: pointColor,
						pointRadius: 5,
						tension: 0.4
					}
				]
			},
			options: {
				onHover(event, chartElements) {
					// @ts-ignore
					const target = event.native ? event.native.target : event.chart.canvas;
					target.style.cursor = chartElements.length ? 'pointer' : 'default';
				},
				responsive: true,
				plugins: {
					tooltip: {
						callbacks: {
							title(context) {
								const value = context[0].raw as ChartPoint;
								return `Клик ${value.x}`;
							},
							afterTitle(context) {
								const value = context[0].raw as ChartPoint;
								return `Число: ${value.number} — ${value.isTarget ? 'Цель' : 'Не цель'}`;
							},
							beforeBody(context) {
								const value = context[0].raw as ChartPoint;
								return [`${value.isCorrect ? 'Найдено' : 'Ошибка'}`];
							},
							label(context) {
								const value = context.raw as ChartPoint;
								return `Реакция: ${formatMs(value.y)}`;
							}
						}
					},
					legend: {
						labels: {
							usePointStyle: true,
							// @ts-ignore
							generateLabels(chart) {
								const original =
									Chart.defaults.plugins.legend.labels.generateLabels(chart);
								const fontColor = original[0]?.['fontColor'] ?? 'white';
								const strokeStyle = original[0]?.['strokeStyle'] ?? 'white';
								return [
									{
										text: 'Среднее время реакции',
										fontColor,
										fillStyle: 'rgba(255,99,132,0.4)',
										strokeStyle: 'rgba(255,99,132,1)',
										pointStyle: 'line',
										lineDash: [6, 6],
										hidden: false,
										index: -1
									},
									{
										text: 'Найденная цель',
										fontColor,
										fillStyle: getCSSVar('--color-green-500'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -2
									},
									{
										text: 'Ошибочный клик',
										fontColor,
										fillStyle: getCSSVar('--color-red-400'),
										strokeStyle,
										pointStyle: 'circle',
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
							text: 'Клик'
						},
						ticks: {
							color: (ctx) => {
								const r = parsed[ctx.index];
								if (!r) return 'white';
								if (r.isTarget && r.isCorrect)
									return getCSSVar('--color-green-500');
								if (!r.isCorrect) return getCSSVar('--color-red-400');
								return 'white';
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
		chart?.destroy?.();
	});
</script>

<div class="grid gap-2 w-full sm:w-4/5">
	<canvas bind:this={canvas}></canvas>
</div>
