<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import type { CorsiBlockResult } from './types';

	let { results }: { results: CorsiBlockResult[] } = $props();

	type ChartPoint = {
		x: number; // длина последовательности (ось X — не номер захода)
		y: number; // answerMs
		raw: CorsiBlockResult;
	};

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const point = ctx.raw as ChartPoint | undefined;
		if (!point) return 'var(--main-text-color)';
		return point.raw.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'var(--main-text-color)';

	let canvas: HTMLCanvasElement | null = $state(null);
	let chart: Chart | null = $state(null);

	onMount(() => {
		if (!canvas || results.length === 0) return;

		const points: ChartPoint[] = results.map((r) => ({
			x: r.sequenceLength,
			y: r.answerMs,
			raw: r
		}));

		// Средняя — по всем заходам: окно ответа единое, «выбросовых» нетапов
		// здесь нет (таймаут — легитимное время ответа).
		const avg = Math.round(points.reduce((a, p) => a + p.y, 0) / points.length);

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				// Дубликаты длин НЕ схлопываются: соседние одинаковые подписи —
				// ретраи той же длины (требование issue #99).
				labels: points.map((p) => p.x),
				datasets: [
					{
						label: 'Заходы',
						data: points,
						borderWidth: 1,
						pointBackgroundColor: pointColor,
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
							title(context) {
								return `Заход ${(context[0].raw as ChartPoint).raw.attempt}`;
							},
							label(context) {
								return `Длина: ${(context.raw as ChartPoint).raw.sequenceLength}`;
							},
							afterLabel(context) {
								const value = context.raw as ChartPoint;
								const status = value.raw.isCorrect ? 'Верно' : 'Ошибка';
								return `Время: ${value.raw.answerMs} мс (${status})`;
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
							text: 'Подсветов в последовательности'
						}
					},
					y: {
						title: {
							display: true,
							text: 'Время ответа (мс)'
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

{#if results.length > 0}
	<div class="grid w-full gap-2 sm:w-4/5">
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}
