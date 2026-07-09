<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { LettersTrialRow, RoundEntry } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: LettersTrialRow[]) => void;
	} = $props();

	const LETTERS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
	const MAX_GAME_SECONDS = 60;
	const SHOW_SECONDS = 3;
	const START_LENGTH = 2;

	let lettersToShow = $state('');
	let userAnswer = $state<string[]>([]);
	let gridLetters = $state<string[]>([]);
	let numLetters = $state(START_LENGTH);
	let showTime = $state(SHOW_SECONDS);
	let started = $state(false);
	let finished = $state(false);
	let showing = $state(false);
	let elapsed = $state(0);
	let maxSpan = $state(0);
	let timeoutTriggered = $state(false);

	let showInterval: ReturnType<typeof setInterval> | null = null;
	let gameInterval: ReturnType<typeof setInterval> | null = null;

	let testStartedAt = 0;
	let inputStartedAt = 0;
	let answerLog: RoundEntry[] = [];

	function shuffle<T>(arr: T[]): T[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function stopTimers() {
		if (showInterval) {
			clearInterval(showInterval);
			showInterval = null;
		}
		if (gameInterval) {
			clearInterval(gameInterval);
			gameInterval = null;
		}
	}

	function nextRound() {
		userAnswer = [];
		const pool = shuffle([...LETTERS]);
		const picked = pool.slice(0, numLetters);
		lettersToShow = shuffle([...picked]).join('');
		gridLetters = shuffle(LETTERS.slice(0, 33));
		numLetters++;
		showTime = SHOW_SECONDS;
		showing = true;

		if (showInterval) clearInterval(showInterval);
		showInterval = setInterval(() => {
			showTime--;
			if (showTime < 0) {
				clearInterval(showInterval);
				showInterval = null;
				showing = false;
				inputStartedAt = Date.now();
			}
		}, 1000);
	}

	function startGame() {
		stopTimers();
		started = true;
		finished = false;
		elapsed = 0;
		maxSpan = 0;
		numLetters = START_LENGTH;
		testStartedAt = Date.now();
		inputStartedAt = 0;
		answerLog = [];
		timeoutTriggered = false;

		gameInterval = setInterval(() => {
			elapsed++;
			if (elapsed >= MAX_GAME_SECONDS) {
				timeoutTriggered = true;
				endGame();
			}
		}, 1000);

		nextRound();
	}

	function pick(letter: string) {
		if (!userAnswer.includes(letter)) userAnswer = [...userAnswer, letter];
	}

	function checkAnswer() {
		const submitted = userAnswer.join('');
		const isCorrect = submitted === lettersToShow;
		const reactionTimeMs = inputStartedAt > 0 ? Date.now() - inputStartedAt : 0;

		answerLog.push({
			target: lettersToShow,
			submitted,
			isCorrect,
			reactionTimeMs,
			letterCount: lettersToShow.length
		});

		if (isCorrect) {
			maxSpan = Math.max(maxSpan, lettersToShow.length);
			nextRound();
		} else {
			endGame();
		}
	}

	function endGame() {
		stopTimers();
		started = false;
		finished = true;
		numLetters = START_LENGTH;
		const trialRows: LettersTrialRow[] = answerLog.map((r, i) => ({
			roundIndex: i + 1,
			target: r.target,
			submitted: r.submitted,
			isCorrect: r.isCorrect,
			reactionTimeMs: r.reactionTimeMs,
			letterCount: r.letterCount,
			timeoutTriggered,
			elapsed
		}));
		sendResults(trialRows);
		gameEnd();
	}

	function handleKeyDown(e: KeyboardEvent) {
		const input = e.target as HTMLInputElement;
		console.log(e);

		const letterMap = new Map<string, string>();

		letterMap.set('KeyQ', 'Й');
		letterMap.set('KeyW', 'Ц');
		letterMap.set('KeyE', 'У');
		letterMap.set('KeyR', 'К');
		letterMap.set('KeyT', 'Е');
		letterMap.set('KeyY', 'Н');
		letterMap.set('KeyU', 'Г');
		letterMap.set('KeyI', 'Ш');
		letterMap.set('KeyO', 'Щ');
		letterMap.set('KeyP', 'З');
		letterMap.set('BracketLeft', 'Х');
		letterMap.set('BracketRight', 'Ъ');

		letterMap.set('KeyA', 'Ф');
		letterMap.set('KeyS', 'Ы');
		letterMap.set('KeyD', 'В');
		letterMap.set('KeyF', 'А');
		letterMap.set('KeyG', 'П');
		letterMap.set('KeyH', 'Р');
		letterMap.set('KeyJ', 'О');
		letterMap.set('KeyK', 'Л');
		letterMap.set('KeyL', 'Д');
		letterMap.set('Semicolon', 'Ж');
		letterMap.set('Quote', 'Э');

		letterMap.set('KeyZ', 'Я');
		letterMap.set('KeyX', 'Ч');
		letterMap.set('KeyC', 'С');
		letterMap.set('KeyV', 'М');
		letterMap.set('KeyB', 'И');
		letterMap.set('KeyN', 'Т');
		letterMap.set('KeyM', 'Ь');
		letterMap.set('Comma', 'Б');
		letterMap.set('Period', 'Ю');

		letterMap.set('Backquote', 'Ё');

		const pickedLetter = letterMap.get(e.code);
		if (pickedLetter && LETTERS.includes(pickedLetter)) {
			pick(pickedLetter);
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeyDown);
	});
</script>

{#if started && showing}
	<div class="flex flex-col items-center justify-center gap-4">
		<p class="text-center text-xl text-white">Запомните буквы!</p>

		<div class="grid max-w-4xl grid-cols-[repeat(3,auto)] justify-center gap-[15px]">
			<p class="text-center text-base text-white">
				Показ: {showTime > 0 ? showTime : 0} сек
			</p>
			<p class="text-center text-base font-semibold text-[#4caf50]">
				Букв: {lettersToShow.length}
			</p>
			<p class="text-center text-base text-white">
				Время игры: {elapsed} сек
			</p>
		</div>

		<div
			class="flex max-w-4xl flex-wrap justify-center gap-3 rounded-3xl bg-white/8 p-5 backdrop-blur-sm"
		>
			{#each [...lettersToShow] as letter, i (i)}
				<button
					type="button"
					disabled
					class="min-w-18 rounded-2xl bg-gray-100 p-4 text-xl font-bold text-indigo-800"
					>{letter}</button
				>
			{/each}
		</div>
	</div>
{:else if started}
	<div class="flex flex-col items-center justify-center gap-4">
		<div class="grid max-w-4xl grid-cols-[repeat(3,auto)] justify-center gap-4">
			<p class="text-center text-base text-white">
				Время: {elapsed} сек
			</p>
			<p class="text-center text-base font-semibold text-[#4caf50]">
				Выбрано: {userAnswer.length} / {lettersToShow.length}
			</p>
			<p class="text-center text-base text-white">
				{userAnswer.length ? userAnswer.join('') : '—'}
			</p>
		</div>

		<div class="flex flex-wrap justify-center max-w-3xl gap-3 rounded-3xl bg-white/8 p-5">
			{#each gridLetters as letter, i (i)}
				<button
					type="button"
					class={userAnswer.includes(letter)
						? 'h-16 w-16 rounded-2xl cursor-pointer bg-[#4caf50]! font-bold text-black!'
						: 'h-16 w-16 rounded-2xl cursor-pointer bg-white font-bold text-indigo-800'}
					onclick={() => pick(letter)}>{letter}</button
				>
			{/each}
		</div>

		<div class="flex flex-row flex-wrap items-center justify-center gap-3">
			<Button color="green" onclick={checkAnswer}>Далее</Button>
			<Button color="red" onclick={() => (userAnswer = [])}>Отменить</Button>
		</div>
	</div>
{:else if finished}
	<div class="flex flex-col items-center justify-center gap-3">
		<p class="text-lg font-semibold text-white">
			{timeoutTriggered ? 'Время вышло' : 'Тест завершён'}
		</p>
	</div>
{:else}
	<Button color="green" onclick={startGame}>Старт</Button>
{/if}
