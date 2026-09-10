<script lang="ts">
	import Chart from 'chart.js/auto';
	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);

	import { onMount, onDestroy } from 'svelte';
	import { getCSSVar } from '$lib/utils';

	import type { RhythmResult } from './types';

	let {
		results,
		meta,
		title = 'Последний результат'
	}: { results: RhythmResult[]; meta?: Record<string, string>; title: string } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	Chart.defaults.color = 'var(--main-text-color)';

	const TRACKS = 6; // фиксированное число дорожек

	let overpressText = $derived.by(() => {
		if (!meta) return '';
		const raw = meta.overpress;
		if (raw == null) return '';
		const val = Number(raw);
		if (Number.isNaN(val) || val === 0) return '';
		if (val > 0) return `Пережатия: ${val}`;
		return `Недожатия: ${Math.abs(val)}`;
	});

	// нормализация значения в [0,1]
	function normalize(value: number, max: number) {
		return max === 0 ? 0 : value / max;
	}

	// цвет точки в зависимости от отклонения
	function getColor(error: number, maxError: number): string {
		// 1 = зелёный, 0 = красный
		const t = 1 - normalize(error, maxError || 1);
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

		const grouped: { x: number; y: number }[][] = Array.from({ length: TRACKS }, () => []);

		sortByNote(results).forEach((r, i) => {
			const track = Math.floor(i / AttemptsInTrack);
			console.log(i, '->', track, i / AttemptsInTrack);

			const attemptIndex = i + 1; // просто по порядку

			grouped[track].push({
				x: attemptIndex,
				y: Math.floor(Math.abs(r.attempt - r.note))
			});
		});

		const flat = grouped.flat();
		if (flat.length === 0) {
			console.warn('ResultsChart: нет данных для отображения');
			return;
		}

		// максимальное отклонение среди всех (для нормализации цвета)
		const maxError = Math.max(...flat.map((r) => r.y ?? 0)) || 1;

		let datasets = grouped
			.map((group, trackIndex) => ({
				label: `${trackIndex + 1}`,
				data: group,
				borderWidth: 1,
				pointRadius: 5,
				tension: 0.3,
				pointBackgroundColor: (ctx: ScriptableContext<'line'>) => {
					// Chart.js иногда вызывает скриптабл-колбэк без точки (легенда/ресайз)
					const point = ctx.raw as { y: number } | undefined;
					if (!point) {
						return getColor(0, maxError);
					}

					const error = point.y ?? maxError;
					return getColor(error, maxError);
				},
				segment: {
					// borderColor: 'rgba(255,255,255,0.3)'
				}
			}))
			// убираем полностью пустые дорожки
			.filter((d) => d.data.length > 0);

		console.log(datasets);

		chart = new Chart(canvas, {
			type: 'line',
			data: { datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false,
						labels: {
							color: getCSSVar('--camp-dark-blue') || '#ffffff'
						}
					},
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const v = ctx.raw as { y: number };
								if (!v) return '';
								return `Отклонение: ${v.y} мс`;
							}
						}
					},
					title: {
						display: true,
						text: title
					}
				},
				scales: {
					x: {
						type: 'linear',
						title: {
							display: true,
							text: 'Нажатие'
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

{#if overpressText}
	<p class="text-center text-sm font-medium text-amber-600">{overpressText}</p>
{/if}
<div class="relative h-80 w-full">
	<canvas bind:this={canvas}></canvas>
</div>
