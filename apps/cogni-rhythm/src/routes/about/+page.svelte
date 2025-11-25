<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';

	import localforage from 'localforage';
	import type { RhythmResult } from '$lib/rhythm/types';

	let resultsEasy: RhythmResult[] | null = $state(null);
	let resultsMedium: RhythmResult[] | null = $state(null);
	let resultsHard: RhythmResult[] | null = $state(null);

	onMount(async () => {
		const resultsEasyLoaded: RhythmResult[] | null = await localforage.getItem('results-easy');
		if (resultsEasyLoaded) {
			console.log(resultsEasy);
			resultsEasy = resultsEasyLoaded;
		}

		const resultsMediumLoaded: RhythmResult[] | null = await localforage.getItem('results-medium');
		if (resultsMediumLoaded) {
			console.log(resultsMedium);
			resultsMedium = resultsMediumLoaded;
		}

		const resultsHardLoaded: RhythmResult[] | null = await localforage.getItem('results-hard');
		if (resultsHardLoaded) {
			console.log(resultsHard);
			resultsHard = resultsHardLoaded;
		}
	});
</script>

<div class="rhythm-game">
	<div class="rhythm-header">
		<h2 class="title">Ритмический тест</h2>
		<p class="subtitle">
			Один шарик в центре. Дорожка с ритмом движется под ним. Сначала ритм показывается, затем вы
			повторяете его.
		</p>
	</div>

	<div class="overlay-card">
		<div class="overlay-text">
			Первые два прохода — эталон, нажатия не учитываются. Затем ориентируйтесь на ритм и нажимайте
			в нужные моменты.
		</div>

		<div class="overlay-text mt-2 font-bold text-3xl underline">Пройдите все уровни сложности:</div>

		<div class="mt-4 flex flex-col gap-4 items-center">
			<div class="flex gap-4 justify-center items-center">
				<Button class="w-28" color="green" goto={'/easy'}>Легкий</Button>
				<span>{resultsEasy ? '✅' : '⬜'}</span>
			</div>
			<div class="flex gap-4 justify-center items-center">
				<Button class="w-28" color="yellow" goto={'/medium'}>Средний</Button>
				<span>{resultsMedium ? '✅' : '⬜'}</span>
			</div>
			<div class="flex gap-4 justify-center items-center">
				<Button class="w-28" color="red" goto={'/hard'}>Сложный</Button>
				<span>{resultsHard ? '✅' : '⬜'}</span>
			</div>
		</div>
	</div>

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

<Button class="mt-4" color="purple" goto={'/results'}>Результаты</Button>

<style>
	.rhythm-game {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		box-sizing: border-box;
		border-radius: 1.25rem;
		box-shadow: 0 20px 35px rgba(15, 23, 42, 0.6);
	}

	.rhythm-header {
		text-align: center;
		max-width: 520px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.title {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: #f9fafb;
	}

	.subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: #cbd5f5;
	}

	.overlay-card {
		max-width: 360px;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		background: rgba(15, 23, 42, 0.95);
		border: 1px solid rgba(148, 163, 184, 0.6);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
	}

	.overlay-text {
		font-size: 0.85rem;
		color: #cbd5f5;
		text-align: center;
	}

	.legend {
		margin-top: 0.25rem;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
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
