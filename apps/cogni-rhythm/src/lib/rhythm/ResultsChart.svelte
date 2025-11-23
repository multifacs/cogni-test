<script lang="ts">
	import Chart from 'chart.js/auto';
	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);

	import { onMount, onDestroy } from 'svelte';
	import { getCSSVar } from '$lib/utils/common';

	import type { RhythmResult } from './types';

	let { results }: { results: RhythmResult[] } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	Chart.defaults.color = 'white';

	const TRACKS = 8; // фиксированное число дорожек
	// 0 1 2 3 4 5 6 7

	// нормализация значения в [0,1]
	function normalize(value: number, max: number) {
		return max === 0 ? 0 : value / max;
	}

	// цвет точки в зависимости от отклонения
	function getColor(error: number, maxError: number, isMiss: boolean): string {
		if (isMiss) return getCSSVar('--color-black-500') || '#000000';

		const t = 1 - normalize(error, maxError); // 1 = зелёный, 0 = красный
		// градиент от красного -> жёлтого -> зелёного
		const r = t < 0.5 ? 255 : Math.round(255 * (1 - (t - 0.5) * 2));
		const g = t < 0.5 ? Math.round(255 * (t * 2)) : 255;
		return `rgb(${r},${g},0)`;
	}

	function sortByNote(results: RhythmResult[]): RhythmResult[] {
		return results.slice().sort((a, b) => a.note - b.note);
	}

	onMount(() => {
		const AttemptsInTrack = Math.ceil(results.length / TRACKS);
		console.log('AttemptsInTrack', AttemptsInTrack);

		// группируем результаты по дорожкам
		const grouped: { x: number; y: number | null; raw: RhythmResult }[][] = Array.from(
			{ length: TRACKS },
			() => []
		);

		sortByNote(results).forEach((r, i) => {
			const track = Math.floor(i / AttemptsInTrack);
			console.log(i, '->', track, i / AttemptsInTrack);
			// const attemptIndex = Math.floor(i / TRACKS) + 1;
			const attemptIndex = i + 1; // просто по порядку

			grouped[track].push({
				x: attemptIndex,
				y: r.attempt === -1 ? 0 : Math.floor(Math.abs(r.attempt - r.note)), // <- всегда число!
				raw: r
			});
		});

		// находим максимальное отклонение среди всех (для нормализации цвета)
		const maxError = Math.max(...grouped.flat().map((r) => r.y ?? 0));

		let datasets = grouped.map((group, trackIndex) => ({
			label: `${trackIndex + 1}`,
			data: group,
			borderWidth: 1,
			pointRadius: 5,
			tension: 0.3,
			pointBackgroundColor: (ctx: ScriptableContext<'line'>) => {
				const result = ctx.raw as { y: number | null; raw: RhythmResult };
				const isMiss = result.raw.attempt === -1;
				const error = result.y ?? maxError;
				return getColor(error, maxError, isMiss);
			},
			segment: {
				// borderColor: 'rgba(255,255,255,0.3)'
			}
		}));

		console.log(datasets);

		chart = new Chart(canvas, {
			type: 'line',
			data: { datasets },
			options: {
				responsive: true,
				onHover: function (event, chartElements) {
					const target = event.native ? event.native.target : event.chart.canvas;
					target.style.cursor = chartElements.length ? 'pointer' : 'default';
				},
				plugins: {
					legend: {
						display: true,
						position: 'top',
						labels: {
							color: 'white',
							font: {
								size: 14
							},
							boxWidth: 10,
							boxHeight: 10,
							padding: 10
						},
						title: {
							display: true,
							text: 'Дорожки',
							color: 'white',
							font: {
								size: 16,
								weight: 'bold'
							}
						}
					},
					tooltip: {
						callbacks: {
							title: (context) => {
								const v = context[0].raw as any;
								return `Попытка ${v.x}`;
							},
							label: (context) => {
								const v = context.raw as any;
								return v.raw.attempt === -1 ? 'Промах' : `Отклонение: ${v.y} мс`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'linear',
						title: {
							display: true,
							text: 'Попытка'
						},
						ticks: {
							stepSize: 1
						}
					},
					y: {
						title: {
							display: true,
							text: 'Отклонение (мс)'
						}
					}
				}
			}
		});
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<canvas bind:this={canvas}></canvas>
