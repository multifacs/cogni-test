<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import { formatMs, summary, kindLabel, type PicturesTrialRow } from './results-adapter';

	type PicturesResult = {
		x: number;
		y: number;
		questionKind: string;
		answer: string | null;
		isCorrect: boolean | null;
		scored: boolean;
		raw: PicturesTrialRow;
	};

	let { questions }: { questions: PicturesTrialRow[] } = $props();

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as PicturesResult | undefined;
		if (!result) return 'white';
		if (result.isCorrect === null) return getCSSVar('--color-gray-400');
		return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	let avg = $state(0);

	function getResults(trials: PicturesTrialRow[]): PicturesResult[] {
		return trials.map((t, i) => ({
			x: i + 1,
			y: t.reactionTimeMs,
			questionKind: t.questionKind,
			answer: t.answer,
			isCorrect: t.isCorrect,
			scored: t.scored,
			raw: t
		}));
	}

	onMount(() => {
		const parsed = getResults(questions);
		const s = summary(questions);

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
								const value = context[0].raw as PicturesResult;
								return `Вопрос ${value.x} (${kindLabel(value.questionKind)})`;
							},
							afterTitle(context) {
								const value = context[0].raw as PicturesResult;
								return value.scored
									? value.isCorrect
										? 'Верно'
										: 'Ошибка'
									: 'Не оценивается';
							},
							beforeBody(context) {
								const value = context[0].raw as PicturesResult;
								return [`Ответ: ${value.answer ?? '(нет)'}`];
							},
							label(context) {
								const value = context.raw as PicturesResult;
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
									},
									{
										text: 'Не оценивается',
										fontColor,
										fillStyle: getCSSVar('--color-gray-400'),
										strokeStyle,
										pointStyle: 'circle',
										hidden: false,
										index: -4
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
							text: 'Вопрос'
						},
						ticks: {
							color: (ctx) => {
								const r = parsed[ctx.index];
								if (!r) return 'white';
								if (r.isCorrect === null) return getCSSVar('--color-gray-400');
								const color = r.isCorrect ? '--color-green-500' : '--color-red-400';
								return getCSSVar(color);
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
