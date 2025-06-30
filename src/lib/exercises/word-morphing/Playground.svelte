<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';
	import { shuffle } from '$lib/utils';
	import { adjectives, nouns } from './logic/data';

	let originalAdjective = $state('');
	let originalNoun = $state('');

	let phase: 'initial' | 'replace-adj' | 'replace-noun' | 'wait' | 'recall' | 'result' =
		$state('initial');
	let adjectiveChoices = $state(['громкий', 'сетчатый', 'яркий', 'скучный']);
	let nounChoices = $state(['подвал', 'эклер', 'телефон', 'рука']);

	let currentAdj = $state('');
	let currentNoun = $state('');

	let recalledCombos: string[] = $state([]);
	let input1 = $state('');
	let input2 = $state('');
	let input3 = $state('');

	const COUNTDOWN_TIME = 30;
	let countdown = $state(COUNTDOWN_TIME);

	async function nextPhase() {
		if (phase === 'initial') phase = 'replace-adj';
		else if (phase === 'replace-adj') phase = 'replace-noun';
		else if (phase === 'replace-noun') {
			phase = 'wait';
			countdown = COUNTDOWN_TIME;
			const countdownInterval = setInterval(() => {
				if (countdown <= 1) {
					phase = 'recall';
					clearInterval(countdownInterval);
				} else {
					countdown = countdown - 1;
				}
			}, 1000);
		} else if (phase === 'recall') phase = 'result';
	}

	function setAdjective(adj: string) {
		currentAdj = adj;
		nextPhase();
	}

	function setNoun(noun: string) {
		currentNoun = noun;
		nextPhase();
	}

	let expectedCombos: string[] = $state([]);

	function finishRecall() {
		expectedCombos = [
			`${originalAdjective} ${originalNoun}`,
			`${currentAdj} ${originalNoun}`,
			`${currentAdj} ${currentNoun}`
		];

		recalledCombos = [input1.trim(), input2.trim(), input3.trim()];
		nextPhase();
	}

	onMount(() => {
		// Перемешиваем и выбираем уникальные слова
		shuffle(adjectives);
		shuffle(nouns);

		originalAdjective = adjectives[0];
		currentAdj = originalAdjective;
		adjectiveChoices = adjectives.slice(1, 6); // 5 уникальных прилагательных кроме оригинала

		originalNoun = nouns[0];
		currentNoun = originalNoun;
		nounChoices = nouns.slice(1, 6); // 5 уникальных существительных кроме оригинала
	});
</script>

<div class="flex flex-col items-center gap-6">
	{#if phase === 'initial'}
		<h2>Словосочетание для запоминания:</h2>
		<p class="text-3xl">{originalAdjective} {originalNoun}</p>
		<Button color="green" onclick={nextPhase}>Далее</Button>
	{:else if phase === 'replace-adj'}
		<h2>Выберите новое прилагательное:</h2>
		<div class="grid">
			{#each adjectiveChoices as adj}
				<Button color="green" onclick={() => setAdjective(adj)}>{adj}</Button>
			{/each}
		</div>
	{:else if phase === 'replace-noun'}
		<h2>Выберите новое существительное:</h2>
		<div class="grid">
			{#each nounChoices as noun}
				<Button color="green" onclick={() => setNoun(noun)}>{noun}</Button>
			{/each}
		</div>
	{:else if phase === 'wait'}
		<div style="display: grid; justify-items: center; align-items: center">
			<span style="grid-column: 1; grid-row: 1;" class="text-3xl">{countdown}</span>
			<svg style="grid-column: 1; grid-row: 1;">
				<circle r="40" cx="50" cy="50"> </circle>
			</svg>
		</div>
	{:else if phase === 'recall'}
		<h2>Вспомните все три словосочетания:</h2>
		<div class="flex w-9/12 flex-col gap-2">
			<TextInput plain name="input1" bind:value={input1} placeholder="1. Исходное"></TextInput>
			<TextInput plain name="input2" bind:value={input2} placeholder="2. С заменой прилагательного"
			></TextInput>
			<TextInput plain name="input3" bind:value={input3} placeholder="3. С заменой прил. и сущ."
			></TextInput>
		</div>
		<Button color="blue" onclick={finishRecall}>Показать результат</Button>
	{:else if phase === 'result'}
		<div class="flex flex-col gap-2">
			<h2>Ваши ответы:</h2>
			<ol>
				{#each recalledCombos as recalled, i}
					<li
						class="text-center"
						style="color: {recalled === expectedCombos[i]
							? 'var(--color-green-500)'
							: 'var(--color-red-400)'}"
					>
						{recalled || '(не введено)'}
					</li>
				{/each}
			</ol>
		</div>

		<div class="flex flex-col gap-2">
			<h2>Ожидаемые ответы:</h2>
			<ul>
				<li class="text-center">{originalAdjective} {originalNoun}</li>
				<li class="text-center">{currentAdj} {originalNoun}</li>
				<li class="text-center">{currentAdj} {currentNoun}</li>
			</ul>
		</div>
	{/if}
</div>

<style>
	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	svg {
		width: 100px;
		height: 100px;
		transform: rotateY(-180deg) rotateZ(-90deg);
	}

	svg circle {
		stroke-dasharray: 251px;
		stroke-dashoffset: 0px;
		stroke-linecap: round;
		stroke-width: 5px;
		stroke: rgb(246, 246, 246);
		fill: none;
		animation: countdown 30s linear infinite forwards;
	}

	@keyframes countdown {
		from {
			stroke-dashoffset: 0px;
		}
		to {
			stroke-dashoffset: 251px;
		}
	}
</style>
