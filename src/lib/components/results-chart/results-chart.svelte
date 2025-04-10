<script lang="ts">
	import Chart from 'chart.js/auto';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);

	import type { Result } from './result';
	import { translate } from '../translate';
	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib';

	let {
		stages = 1,
		results,
		xtitle,
		ytitle,
		evaltype = 'correctness'
	}: {
		stages: number;
		results: Result[];
		xtitle: string;
		ytitle: string;
		evaltype?: EvalType;
	} = $props();

	type EvalType = 'correctness' | 'value';
	type EvalFunction = (ctx: ScriptableContext<'line'>) => string;
	type EvalObject = {
		[key in EvalType]: EvalFunction;
	};
	const evalFuncs: EvalObject = {
		correctness: (ctx: ScriptableContext<'line'>) => {
			const result = ctx.raw as Result;
			return result.isCorrect ? getCSSVar('--color-green-500') : getCSSVar('--color-red-400');
		},
		value: (ctx: ScriptableContext<'line'>) => {
			const result = ctx.raw as Result;
			return result.y == 0
				? getCSSVar('--color-green-500')
				: result.y > 0
					? getCSSVar('--color-red-400')
					: getCSSVar('--color-sky-400');
		}
	};

	Chart.defaults.color = 'white';

	let canvas: HTMLCanvasElement = $state(Object());
	let chart = $state(Object());
	const stageNums: number[] = [];
	for (let i = 1; i <= stages; i++) stageNums.push(i);

	function compareNumbers(a: number, b: number) {
		return a - b;
	}

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: results.map((el) => el.x).sort(compareNumbers),
				datasets: stageNums.map((stage) => {
					return {
						label: translate(`stage ${stage}`),
						data: results.filter((el) => el.stage == stage),
						borderWidth: 1,
						pointBackgroundColor: evalFuncs[evaltype],
						pointRadius: 5,
						tension: 0.4
					};
				})
			},
			options: {
				responsive: true,
				plugins: {
					title: {
						text: 'Результаты',
						display: true
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: xtitle
						}
					},
					y: {
						title: {
							display: true,
							text: ytitle
						}
					}
				}
			}
		});
	});
	onDestroy(() => {
		// console.log('destroy');
		chart.destroy();
	});
</script>

<canvas bind:this={canvas}></canvas>
