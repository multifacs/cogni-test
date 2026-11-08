<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import { difficultyLabel, formatMs, summary, type OrigamiAttemptRow } from './results-adapter';

	import '@fontsource/fira-code';

	type OrigamiResult = {
		x: number;
		y: number;
		difficultyLabel: string;
		isCorrect: boolean;
	};

	let { attempts }: { attempts: OrigamiAttemptRow[] } = $props();

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as OrigamiResult | undefined;
		if (!result) return 'var(--main-text-color)';
		return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'var(--main-text-color)';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	let avg = $state(0);

	function getResults(attempts: OrigamiAttemptRow[]): OrigamiResult[] {
		return attempts.map((a, i) => ({
			x: i + 1,
			y: a.responseTimeMs,
			difficultyLabel: difficultyLabel(a.difficulty),
			isCorrect: a.isCorrect
		}));
	}

	onMount(() => {
		const parsed = getResults(attempts);
		const s = summary(attempts);

		avg = s.averageResponseTimeMs;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsed.map((r) => r.x),
				datasets: [
					{
						label: 'Время ответа',
						data: parsed,
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
								const value = context[0].raw as OrigamiResult;
								return `Задание ${value.x}`;
							},
							afterTitle(context) {
								const value = context[0].raw as OrigamiResult;
								return value.difficultyLabel;
							},
							label(context) {
								const value = context.raw as OrigamiResult;
								const status = value.isCorrect ? 'Верно' : 'Ошибка';
								return `Ответ: ${formatMs(value.y)} (${status})`;
							}
						},
						titleFont: { family: 'Fira Code' }
					},
					legend: {
						labels: {
							usePointStyle: true,
							generateLabels(chart) {
								const original =
									Chart.defaults.plugins.legend.labels.generateLabels(chart);
								const fontColor = original[0]?.['fontColor'] ?? 'white';
								const strokeStyle = original[0]?.['strokeStyle'] ?? 'white';
								return [
									{
										text: 'Среднее время ответа',
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
							text: 'Задание'
						},
						ticks: {
							color: (ctx) => {
								const r = parsed[ctx.index];
								if (!r) return 'white';
								const color = r.isCorrect ? '--color-green-500' : '--color-red-400';
								return getCSSVar(color);
							},
							font: {
								weight: 'bold',
								family: 'Fira Code'
							}
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
		chart?.destroy?.();
	});
</script>

<div class="grid w-full gap-2 sm:w-4/5">
	<canvas bind:this={canvas}></canvas>
</div>
