<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import type { DotPositionResult } from './types';

	let { results }: { results: DotPositionResult[] } = $props();

	// Подписи этапов дублируют STAGES из Result.svelte: выносить в общий хелпер
	// нельзя без файла вне write set, а цикл Result ↔ ResultsChart недопустим.
	const STAGE_LABELS: Record<DotPositionResult['stage'], string> = {
		1: 'Этап 1 (сетка 5×5)',
		2: 'Этап 2 (сетка 3×3)',
		3: 'Этап 3 (без сетки)'
	};

	type ChartPoint = {
		x: number;
		y: number;
		stage: DotPositionResult['stage'];
		raw: DotPositionResult;
	};

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const point = ctx.raw as ChartPoint | undefined;
		if (!point) return 'var(--main-text-color)';
		return point.raw.correct ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'var(--main-text-color)';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	onMount(() => {
		if (results.length === 0) return;

		const points: ChartPoint[] = results.map((r) => ({
			x: r.attempt,
			y: r.reactionMs,
			stage: r.stage,
			raw: r
		}));

		// Средняя — только по тап-раундам: нетапы (10000 мс) задрали бы линию к потолку.
		const tapPoints = points.filter((p) => p.raw.distance !== null);
		const avg =
			tapPoints.length === 0
				? null
				: Math.round(tapPoints.reduce((a, p) => a + p.y, 0) / tapPoints.length);

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: points.map((p) => p.x),
				datasets: ([1, 2, 3] as const).map((stage) => ({
					label: STAGE_LABELS[stage],
					data: points.filter((p) => p.stage === stage),
					borderWidth: 1,
					pointBackgroundColor: pointColor,
					pointRadius: 5,
					tension: 0.4
				}))
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
							title(context) {
								const value = context[0].raw as ChartPoint;
								return `Раунд ${value.x}`;
							},
							afterTitle(context) {
								const value = context[0].raw as ChartPoint;
								return STAGE_LABELS[value.stage];
							},
							label(context) {
								const value = context.raw as ChartPoint;
								const status = value.raw.correct ? 'Верно' : 'Ошибка';
								return `Реакция: ${value.y.toFixed(2)} мс (${status})`;
							},
							afterLabel(context) {
								const value = context.raw as ChartPoint;
								return value.raw.distance !== null
									? `Отклонение: ${value.raw.distance.toFixed(2)}`
									: 'Нет ответа';
							}
						}
					},
					legend: {
						labels: {
							usePointStyle: true,
							generateLabels(chart) {
								const original =
									Chart.defaults.plugins.legend.labels.generateLabels(chart);
								original.forEach((item) => {
									item.pointStyle = 'line';
								});
								const fontColor = original[0]?.['fontColor'] ?? 'white';
								const strokeStyle = original[0]?.['strokeStyle'] ?? 'white';
								original.push(
									{
										text: 'Средняя (по ответам)',
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
										index: -2
									},
									{
										text: 'Ошибка',
										fontColor,
										fillStyle: getCSSVar('--color-red-400'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -3
									}
								);
								return original;
							}
						}
					},
					annotation: {
						annotations:
							avg === null
								? {}
								: {
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
							text: 'Раунд'
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

{#if results.length > 0}
	<div class="grid w-full gap-2 sm:w-4/5">
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}
