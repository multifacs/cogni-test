<script lang="ts">
	import { submitAttempt } from '$lib/tests/recordAttempt';

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
		'😳',
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

	// Трекинг для статистики
	let testStartedAt = 0;     // момент нажатия "Начать тест"
	let emojiShownAt = 0;      // момент показа текущего стимула
	type TrialLog = {
		index: number;
		previousEmoji: string;
		currentEmoji: string;
		actualChanged: boolean;
		userSaidChanged: boolean;
		isCorrect: boolean;
		reactionTimeMs: number;
	};
	let trialLog: TrialLog[] = [];

	function randomEmoji(exclude?: string) {
		let filtered = exclude
			? EMOJIS.filter((e) => e !== exclude)
			: EMOJIS;

		return filtered[
			Math.floor(Math.random() * filtered.length)
		];
	}

	function generateNextEmoji() {
		previousEmoji = currentEmoji;

		// 50% шанс изменения
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

		if (isCorrect) {
			score++;
		} else {
			mistakes++;
		}

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

		currentEmoji = randomEmoji();
		previousEmoji = currentEmoji;

		testStartedAt = Date.now();
		trialLog = [];

		generateNextEmoji();

		timerInterval = window.setInterval(() => {
			timeLeft--;

			if (timeLeft <= 0) {
				finishTest();
			}
		}, 1000);
	}

	function finishTest() {
		finished = true;
		started = false;

		cleanup();
		void sendAttemptToServer();
	}

	// Отправка результатов в БД через единый API
	async function sendAttemptToServer() {
		if (trialLog.length === 0) return;

		// Сигнальная теория: разбиваем ответы на 4 категории
		const hits = trialLog.filter((t) => t.actualChanged && t.userSaidChanged).length;
		const misses = trialLog.filter((t) => t.actualChanged && !t.userSaidChanged).length;
		const falseAlarms = trialLog.filter((t) => !t.actualChanged && t.userSaidChanged).length;
		const correctRejections = trialLog.filter((t) => !t.actualChanged && !t.userSaidChanged).length;

		const correctRts = trialLog.filter((t) => t.isCorrect).map((t) => t.reactionTimeMs);
		const avgReactionMs = correctRts.length
			? Math.round(correctRts.reduce((s, v) => s + v, 0) / correctRts.length)
			: 0;

		const meta = {
			durationSeconds: TEST_DURATION,
			totalTrials: trialLog.length,
			hits,
			misses,
			falseAlarms,
			correctRejections,
			avgReactionMs
		};

		await submitAttempt({
			testSlug: 'emoji',
			startedAt: new Date(testStartedAt).toISOString(),
			durationMs: Date.now() - testStartedAt,
			score,
			maxScore: trialLog.length,
			normalizedScore: trialLog.length ? Math.round((score / trialLog.length) * 100) : 0,
			meta,
			answers: trialLog.map((entry) => ({
				questionId: `trial-${entry.index}`,
				answer: entry.userSaidChanged ? 'changed' : 'unchanged',
				isCorrect: entry.isCorrect,
				reactionTimeMs: entry.reactionTimeMs,
				meta: {
					previousEmoji: entry.previousEmoji,
					currentEmoji: entry.currentEmoji,
					actualChanged: entry.actualChanged
				}
			}))
		});
	}

	function cleanup() {
		clearInterval(timerInterval);
	}

	const accuracy = $derived(
		totalAnswers === 0
			? 0
			: Math.round((score / totalAnswers) * 100)
	);
</script>

<svelte:head>
	<title>Emoji Cognitive Test</title>
</svelte:head>

<div class="wrapper">
	<div class="stats">
		<div>
			<span>Время</span>
			<strong>{timeLeft}s</strong>
		</div>

		<div>
			<span>Очки</span>
			<strong>{score}</strong>
		</div>

		<div>
			<span>Ошибки</span>
			<strong>{mistakes}</strong>
		</div>

		<div>
			<span>Точность</span>
			<strong>{accuracy}%</strong>
		</div>
	</div>

	<div class="emoji-card">
		<div class="emoji">
			{currentEmoji}
		</div>
	</div>

	{#if !started && !finished}
		<button class="start" onclick={startTest}>
			Начать тест
		</button>
	{/if}

	{#if started}
		<div class="buttons">
			<button onclick={() => answer(true)}>
				Изменился
			</button>

			<button onclick={() => answer(false)}>
				Не изменился
			</button>
		</div>
	{/if}

	{#if finished}
		<div class="result">
			<h2>Тест завершён</h2>

			<p class="right">Правильных: {score}</p>
			<p class="error">Ошибок: {mistakes}</p>
			<p>Точность: {accuracy}%</p>

			<button class="restart" onclick={startTest}>
				Пройти снова
			</button>
		</div>
	{/if}

</div>

<style>
	.wrapper {
		margin: 0;
		font-family: Inter, sans-serif;
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px;
		gap: 24px;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		width: 100%;
		max-width: 700px;
	}

	.stats div {
		/* background: #1e293b; */
		background: #364b6c;
		padding: 16px;
		border-radius: 16px;
		text-align: center;
	}

	.stats span {
		display: block;
		opacity: 0.7;
		margin-bottom: 8px;
	}

	.stats strong {
		font-size: 1.5rem;
	}

	.emoji-card {
		width: 260px;
		height: 260px;
		background: #364b6c;
		border-radius: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 10px 30px rgba(0,0,0,0.3);
	}

	.emoji {
        font-family: sans-serif;
        font-variant-emoji: text;
		font-size: 7rem;
		user-select: none;
	}

	.buttons {
		display: flex;
		gap: 16px;
	}

	button {
		border: none;
		border-radius: 14px;
		padding: 14px 22px;
		font-size: 1rem;
		cursor: pointer;
		transition: 0.2s;
		font-weight: 600;
	}

	button:hover {
		transform: translateY(-2px);
	}


	.start, .restart {
		padding: 12px 24px;
		background: white;
		color: #0c1452;
		border: none;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, opacity 0.2s;
	
	}

	.buttons button:first-child {
		background: #3b82f6;
		color: white;
	}

	.buttons button:last-child {
		background: #ef4444;
		color: white;
	}

	.result {
		background: #364b6c;
		padding: 24px;
		border-radius: 20px;
		text-align: center;
		min-width: 280px;
	}

	.error {
		color: #ff4d4d !important;
	}

	.right {
		color: #4caf50 !important;
	}


	.result h2 {
		margin-top: 0;
	}
</style>