<script lang="ts">
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);
	Chart.register(annotationPlugin);

	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import { formatMs, summary, taskClassLabel, type RavenAttemptRow } from './results-adapter';

	import '@fontsource/fira-code';

	type RavenResult = {
		x: number;
		y: number;
		difficultyLevel: number;
		difficultyScore: number;
		taskClassLabel: string;
		isCorrect: boolean;
		raw: RavenAttemptRow;
	};

	let { attempts }: { attempts: RavenAttemptRow[] } = $props();

	const pointColor = (ctx: ScriptableContext<'line'>) => {
		const result = ctx.raw as RavenResult | undefined;
		if (!result) return 'white';
		return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());

	let avg = $state(0);
	let allTime = $state(0);

	function getResults(attempts: RavenAttemptRow[]): RavenResult[] {
		return attempts.map((a, i) => ({
			x: i + 1,
			y: a.responseTimeMs,
			difficultyLevel: a.difficultyLevel,
			difficultyScore: a.difficultyScore,
			taskClassLabel: taskClassLabel(a.taskClass),
			isCorrect: a.isCorrect,
			raw: a
		}));
	}

	onMount(() => {
		const parsed = getResults(attempts);
		const s = summary(attempts);

		avg = s.averageResponseTimeMs;
		allTime = Math.round(s.totalDurationMs / 1000);

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
								const value = context[0].raw as RavenResult;
								return `Задание ${value.x}`;
							},
							afterTitle(context) {
								const value = context[0].raw as RavenResult;
								return `${value.taskClassLabel} · Уровень ${value.difficultyLevel} (score ${value.difficultyScore.toFixed(2)})`;
							},
							beforeBody(context) {
								const r = context[0].raw as RavenResult;
								const raw = r.raw;
								const selected =
									raw.selectedIndex != null ? `#${raw.selectedIndex + 1}` : '—';
								const correct = `#${raw.correctIndex + 1}`;
								const family = raw.selectedFamily ?? '—';
								return [
									`Ответ: ${selected} (верный: ${correct})`,
									`Тип ошибки: ${family}`
								];
							},
							label(context) {
								const value = context.raw as RavenResult;
								const status = value.isCorrect ? 'Верно' : 'Ошибка';
								return `Реакция: ${formatMs(value.y)} (${status})`;
							},
							afterBody(context) {
								const r = context[0].raw as RavenResult;
								const raw = r.raw;
								const rules = (() => {
									try {
										return JSON.parse(raw.rules);
									} catch {
										return [];
									}
								})();
								const tags = (() => {
									try {
										return JSON.parse(raw.skillTags);
									} catch {
										return [];
									}
								})();
								const lines: string[] = [];
								if (rules.length) lines.push(`Правила: ${rules.join(', ')}`);
								if (tags.length) lines.push(`Навыки: ${tags.join(', ')}`);
								return lines;
							}
						},
						titleFont: { family: 'Fira Code' }
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

<style>

	.stats-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	@media (min-width: 640px) {
		.stats-row {
			gap: 0.75rem 1.5rem;
			font-size: 0.85rem;
		}
	}
</style>
