<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import type { SimonBlock, SimonResult } from './types';
	import { summarize } from './results-adapter';

	let { results }: { results: SimonResult[] } = $props();

	type ChartPoint = {
		x: number; // сквозной номер пробы (trialIndex)
		y: number; // responseTimeMs
		raw: SimonResult;
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

		const points: ChartPoint[] = [...results]
			.sort((a, b) => a.trialIndex - b.trialIndex)
			.map((r) => ({ x: r.trialIndex, y: r.responseTimeMs, raw: r }));

		// Средняя — по отвеченным (не таймаут) пробам: у старых сессий
		// таймаут нёс окно ответа (3000 мс), а не время реакции. В новых
		// сессиях таймаутов нет. Если отвеченных нет — линию не рисуем.
		const meanMs = summarize(results).overall.meanResponseMs;

		// Вертикальные разделители между блоками: по индексу категории
		// (граница «после k-й пробы» = k − 0.5 в индексном пространстве).
		const presentBlocks = ([1, 2, 3] as SimonBlock[]).filter((b) =>
			results.some((r) => r.block === b)
		);
		const boundaries: number[] = [];
		let cumulative = 0;
		for (const block of presentBlocks.slice(0, -1)) {
			cumulative += results.filter((r) => r.block === block).length;
			boundaries.push(cumulative - 0.5);
		}

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: points.map((p) => p.x),
				datasets: [
					{
						label: 'Пробы',
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
								return `Проба ${(context[0].raw as ChartPoint).raw.trialIndex}`;
							},
							label(context) {
								const raw = (context.raw as ChartPoint).raw;
								return `Часть ${raw.block}, ${raw.congruency}`;
							},
							afterLabel(context) {
								const value = context.raw as ChartPoint;
								const status = value.raw.timedOut
									? 'Таймаут'
									: value.raw.isCorrect
										? 'Верно'
										: 'Ошибка';
								return `Время: ${value.raw.responseTimeMs} мс (${status})`;
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
							...(meanMs !== null && {
								averageLine: {
									type: 'line',
									yMin: meanMs,
									yMax: meanMs,
									borderColor: 'rgba(255,99,132,1)',
									borderWidth: 2,
									borderDash: [6, 6]
								}
							}),
							// Вертикальные пунктирные линии между частями 1|2 и 2|3.
							...Object.fromEntries(
								boundaries.map((x, i) => [
									`blockBoundary${i}`,
									{
										type: 'line',
										xMin: x,
										xMax: x,
										borderColor: 'rgba(148,163,184,0.7)',
										borderWidth: 1,
										borderDash: [4, 4]
									}
								])
							)
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Проба (части разделены пунктиром)'
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
