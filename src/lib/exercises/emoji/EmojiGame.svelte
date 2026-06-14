<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { EmojiResult, TrialLog } from './types';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: EmojiResult[]) => void;
	} = $props();

	const EMOJIS = [
		'😀',
		'😃',
		'😄',
		'😁',
		'😆',
		'😅',
		'😂',
		'🙂',
		'🙃',
		'😉',
		'😊',
		'😇',
		'😍',
		'😘',
		'😗',
		'😙',
		'😚',
		'😋',
		'😛',
		'😜',
		'🤓',
		'😎',
		'😏',
		'😐',
		'😑',
		'🙂',
		'🙄',
		'😬',
		'🤥',
		'😶',
		'🤠',
		'😳'
	];

	const TEST_DURATION = 60;

	let currentEmoji = $state('😀');
	let previousEmoji = $state('😀');

	let started = $state(false);
	let finished = $state(false);

	let timeLeft = $state(TEST_DURATION);

	let score = $state(0);
	let mistakes = $state(0);
	let totalAnswers = $state(0);

	let actualChanged = $state(false);

	let timerInterval: number;

	let emojiShownAt = 0;
	let trialLog: TrialLog[] = [];

	function randomEmoji(exclude?: string) {
		let filtered = exclude ? EMOJIS.filter((e) => e !== exclude) : EMOJIS;
		return filtered[Math.floor(Math.random() * filtered.length)];
	}

	function generateNextEmoji() {
		previousEmoji = currentEmoji;
		actualChanged = Math.random() > 0.5;
		if (actualChanged) {
			currentEmoji = randomEmoji(currentEmoji);
		} else {
			currentEmoji = previousEmoji;
		}
		emojiShownAt = Date.now();
	}

	function answer(userThinksChanged: boolean) {
		if (!started || finished) return;

		const now = Date.now();
		const reactionTimeMs = emojiShownAt > 0 ? now - emojiShownAt : 0;
		const isCorrect = userThinksChanged === actualChanged;

		totalAnswers++;
		if (isCorrect) score++;
		else mistakes++;

		trialLog.push({
			index: totalAnswers,
			previousEmoji,
			currentEmoji,
			actualChanged,
			userSaidChanged: userThinksChanged,
			isCorrect,
			reactionTimeMs
		});

		generateNextEmoji();
	}

	function startTest() {
		cleanup();
		started = true;
		finished = false;
		score = 0;
		mistakes = 0;
		totalAnswers = 0;
		timeLeft = TEST_DURATION;
		// currentEmoji = randomEmoji();
		// previousEmoji = currentEmoji;
		trialLog = [];
		generateNextEmoji();

		timerInterval = window.setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) finishTest();
		}, 1000);
	}

	function finishTest() {
		finished = true;
		started = false;
		cleanup();
		const result: EmojiResult = {
			score,
			mistakes,
			totalAnswers,
			accuracy: totalAnswers === 0 ? 0 : Math.round((score / totalAnswers) * 100),
			trialLog
		};
		sendResults([result]);
		gameEnd();
	}

	function cleanup() {
		clearInterval(timerInterval);
	}

	const accuracy = $derived(totalAnswers === 0 ? 0 : Math.round((score / totalAnswers) * 100));
</script>

<!-- {#if !started && }
	<div class="flex flex-col items-center justify-center gap-2">
		<Button color="green" onclick={startTest}>Начать тест</Button>
		<h2>
			В первый ход нужно нажать "Не изменился", а затем нажимать в зависимости от
			(не)изменения эмодзи
		</h2>
	</div>
{/if} -->

{#if !finished}
	<div class="flex flex-col items-center justify-center gap-6 text-white">
		<div class="grid w-full grid-cols-4 gap-4">
			<div
				class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-2 text-center"
			>
				<span class="mb-2 block text-sm opacity-70">Время</span><strong class="text-2xl"
					>{timeLeft}s</strong
				>
			</div>
			<div
				class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-4 text-center"
			>
				<span class="mb-2 block text-sm opacity-70">Очки</span><strong class="text-2xl"
					>{score}</strong
				>
			</div>
			<div
				class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-4 text-center"
			>
				<span class="mb-2 block text-sm opacity-70">Ошибки</span><strong class="text-2xl"
					>{mistakes}</strong
				>
			</div>
			<div
				class="flex flex-col items-center justify-center rounded-2xl bg-[#364b6c] p-4 text-center"
			>
				<span class="mb-2 block text-sm opacity-70">Точность</span><strong class="text-2xl"
					>{accuracy}%</strong
				>
			</div>
		</div>

		<div
			class="flex h-64 w-64 items-center justify-center rounded-3xl bg-[#364b6c] shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
		>
			<div class="font-sans text-9xl select-none">
				{currentEmoji}
			</div>
		</div>

		{#if !started}
			<div class="flex flex-col items-center justify-center gap-2">
				<Button color="green" onclick={startTest}>Начать тест</Button>
				<h2>Запомни эмодзи до начала</h2>
			</div>
		{:else}
			<div class="flex gap-4">
				<Button color="blue" onclick={() => answer(true)}>Изменился</Button>
				<Button color="red" onclick={() => answer(false)}>Не изменился</Button>
			</div>
		{/if}
	</div>
{/if}
