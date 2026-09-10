<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';

	import localforage from 'localforage';
	// import type { RhythmResult } from '$lib/exercises/rhythm/types';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';

	// TODO: we don't actually have the results in localforage and db ones
	// do not have information about difficulty attached. Do we even need that?
	/*
	let resultsEasy: RhythmResult[] | null = $state(null);
	let resultsMedium: RhythmResult[] | null = $state(null);
	let resultsHard: RhythmResult[] | null = $state(null);
	*/

	// onMount(async () => {
	// 	const resultsEasyLoaded: RhythmResult[] | null = await localforage.getItem('results-easy');
	// 	if (resultsEasyLoaded) {
	// 		console.log(resultsEasy);
	// 		resultsEasy = resultsEasyLoaded;
	// 	}
	//
	// 	const resultsMediumLoaded: RhythmResult[] | null =
	// 		await localforage.getItem('results-medium');
	// 	if (resultsMediumLoaded) {
	// 		console.log(resultsMedium);
	// 		resultsMedium = resultsMediumLoaded;
	// 	}
	//
	// 	const resultsHardLoaded: RhythmResult[] | null = await localforage.getItem('results-hard');
	// 	if (resultsHardLoaded) {
	// 		console.log(resultsHard);
	// 		resultsHard = resultsHardLoaded;
	// 	}
	// });

	// TODO: can we pass the difficulty as a prop somehow with our current setup?
	function setDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
		localforage.setItem('rhythm-difficulty', difficulty);
		goto('/exercises/rhythm/playground');
	}
</script>

<div class="flex flex-col items-center gap-1 p-1.5">
	<div class="text-center">
		<h2 class="title">Ритмический тест</h2>
		<p class="subtitle">
			Один шарик в центре. Дорожка с ритмом движется под ним. Сначала ритм показывается, затем
			вы повторяете его.
		</p>
	</div>

	<Card>
		<div class="overlay-text">
			Первые два прохода — эталон, <b>нажатия не учитываются</b>. Затем нужно ориентироваться
			на <b>подсказки</b>
			и нажимать в нужный момент, а после ориентироваться только на ритм и нажимать без
			<b>подсказок</b>.
		</div>

		<div class="overlay-text mt-2 text-3xl font-bold underline">
			Пройдите все уровни сложности:
		</div>

		<div class="mt-4 flex items-center gap-2">
			<div class="flex flex-col items-center justify-center gap-2">
				<Button class="w-26" color="green" onclick={() => setDifficulty('easy')}
					>Легкий</Button
				>

				<!-- <span class="text-[10px]">{resultsEasy ? 'Пройдено!' : 'Не пройдено'}</span> -->
				<!-- <span>{resultsEasy ? '✅' : '⬜'}</span> -->
			</div>
			<div class="flex flex-col items-center justify-center gap-2">
				<Button color="yellow" onclick={() => setDifficulty('medium')}>Средний</Button>

				<!-- <span class="text-[10px]">{resultsMedium ? 'Пройдено!' : 'Не пройдено'}</span> -->
				<!-- <span>{resultsMedium ? '✅' : '⬜'}</span> -->
			</div>
			<div class="flex flex-col items-center justify-center gap-2">
				<Button class="w-26" color="red" onclick={() => setDifficulty('hard')}
					>Сложный</Button
				>
				<!-- <span class="text-[10px]">{resultsHard ? 'Пройдено!' : 'Не пройдено'}</span> -->
				<!-- <span>{resultsHard ? '✅' : '⬜'}</span> -->
			</div>
		</div>

		<div class="mt-2 text-center text-[10px] text-gray-500">
			Уровни можно проходить многократно.
		</div>
	</Card>

	<div class="legend">
		<div class="legend-item">
			<span class="legend-dot ghost"></span>
			<span>Подсказки (первые 4 прохода)</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot user"></span>
			<span>Ваши нажатия</span>
		</div>
	</div>
</div>

<Button class="mt-4" color="purple" goto={'/exercises/rhythm/results'}>Результаты</Button>

<style>
	.legend {
		margin-top: 0.25rem;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		display: inline-block;
	}

	.legend-dot.ghost {
		background: rgba(148, 163, 184, 0.85);
	}

	.legend-dot.user {
		background: #60a5fa;
	}
</style>
