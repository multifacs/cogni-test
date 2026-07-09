<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import { formatMs, summary, type LettersTrialRow } from './results-adapter';

	type LettersResult = {
		x: number;
		y: number;
		target: string;
		submitted: string;
		isCorrect: boolean;
		letterCount: number;
		timeoutTriggered: boolean;
		elapsed: number;
		raw: LettersTrialRow;
	};

	let { trials }: { trials: LettersTrialRow[] } = $props();

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as LettersResult | undefined;
		if (!result) return 'white';
		return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	let avg = $state(0);

	function getResults(trials: LettersTrialRow[]): LettersResult[] {
		return trials.map((t, i) => ({
			x: i + 1,
			y: t.reactionTimeMs,
			target: t.target,
			submitted: t.submitted,
			isCorrect: t.isCorrect,
			letterCount: t.letterCount,
			timeoutTriggered: t.timeoutTriggered,
			elapsed: t.elapsed,
			raw: t
		}));
	}

	onMount(() => {
		const parsed = getResults(trials);
		const s = summary(trials);

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
								const value = context[0].raw as LettersResult;
								return `Раунд ${value.x}`;
							},
							afterTitle(context) {
								const value = context[0].raw as LettersResult;
								return `Букв: ${value.letterCount} — ${value.isCorrect ? 'Верно' : 'Ошибка'}`;
							},
							beforeBody(context) {
								const value = context[0].raw as LettersResult;
								return [`Цель: ${value.target} → Ответ: ${value.submitted}`];
							},
							label(context) {
								const value = context.raw as LettersResult;
								const status = value.isCorrect ? 'Верно' : 'Ошибка';
								return `Реакция: ${formatMs(value.y)} (${status})`;
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
							text: 'Проба'
						},
						ticks: {
							color: (ctx) => {
								const r = parsed[ctx.index];
								if (!r) return 'white';
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
