<script lang="ts">
	import Chart from 'chart.js/auto';

	import { Colors, type ScriptableContext } from 'chart.js';
	Chart.register(Colors);

	import type { Result } from './types';
	import { translate } from '../../utils/common';
	import { onDestroy, onMount } from 'svelte';
	import { getCSSVar } from '$lib/utils';
	import type { TestResultMap } from '$lib/tests/types';

	let {
		testType,
		results,
		xtitle,
		ytitle
	}: {
		testType: keyof TestResultMap;
		results: TestResultMap[typeof testType][];
		xtitle: string;
		ytitle: string;
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

	let maxStage = Math.max(...results.map((item) => item.stage));
	if (!maxStage || maxStage == 1) maxStage = 0;

	if (testType == 'campimetry') maxStage = 0;

	let stageNums: number[] = [];
	for (let i = 1; i <= maxStage; i++) stageNums.push(i);
	if (!maxStage) stageNums = [0];

	function compareNumbers(a: number, b: number) {
		return a - b;
	}

	function getResults(
		testType: keyof TestResultMap,
		results: TestResultMap[typeof testType][]
	): Result[] {
		console.log(results);
		if (testType == 'stroop') {
			return results.map((result) => {
				return {
					x: result.attempt + 1,
					y: result.time,
					stage: result.stage,
					isCorrect: result.isCorrect
				};
			});
		}
		if (testType == 'math' || testType == 'swallow' || testType == 'memory') {
			return results.map((result) => {
				return {
					x: result.attempt + 1,
					y: result.time,
					stage: 0,
					isCorrect: result.isCorrect
				};
			});
		}
		if (testType == 'munsterberg') {
			return results.map((result) => {
				return {
					x: result.attempt + 1,
					y: result.time,
					stage: 0,
					isCorrect: result.guessed
				};
			});
		}

		if (testType == 'campimetry') {
			return results
				.filter((x) => x.stage == 2)
				.map((result) => {
					return {
						x: Math.round((result.attempt - 1) / 2) + 1,
						y: result.delta,
						stage: 0,
						isCorrect: false
					};
				});
		}
		return [];
	}

	onMount(() => {
		const parsedResults = getResults(testType, results);
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: parsedResults.map((el) => el.x).sort(compareNumbers),
				datasets: stageNums.map((stage) => {
					return {
						label: translate(`stage ${stage}`),
						data: parsedResults.filter((el) => el.stage == stage),
						borderWidth: 1,
						pointBackgroundColor:
							testType == 'campimetry' ? evalFuncs['value'] : evalFuncs['correctness'],
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
		// chart.destroy();
	});
</script>

<canvas bind:this={canvas}></canvas>
