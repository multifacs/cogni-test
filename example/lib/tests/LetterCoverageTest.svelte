<script>
	// @ts-nocheck
	// Svelte 5 runes
	import { submitAttempt } from '$lib/tests/recordAttempt';

	const LETTERS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
	const MAX_GAME_SECONDS = 60;
	const SHOW_SECONDS = 3;
	const START_LENGTH = 2;

	let lettersToShow = $state('');
	let userAnswer = $state([]);
	let gridLetters = $state([]);
	let numLetters = $state(START_LENGTH);
	let showTime = $state(SHOW_SECONDS);
	let started = $state(false);
	let finished = $state(false);
	let showing = $state(false);
	let elapsed = $state(0);
	let maxSpan = $state(0);
	let timeoutTriggered = $state(false);

	let showInterval = null;
	let gameInterval = null;

	// Трекинг для статистики
	let testStartedAt = 0;   // момент нажатия Старт
	let inputStartedAt = 0;  // момент, когда показ закончился и пользователь начал выбирать
	let answerLog = [];      // лог раундов

	function shuffle(arr) {
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
		numLetters = numLetters + 1;
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

	function pick(letter) {
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
		void sendAttemptToServer();
	}

	function restart() {
		stopTimers();
		started = false;
		finished = false;
		showing = false;
		maxSpan = 0;
		elapsed = 0;
		answerLog = [];
		timeoutTriggered = false;
	}

	// Отправка результатов в БД через единый API
	async function sendAttemptToServer() {
		if (answerLog.length === 0) return;

		const roundsCompleted = answerLog.filter((round) => round.isCorrect).length;
		const meta = {
			maxSpan,
			roundsCompleted,
			roundsAttempted: answerLog.length,
			timeoutTriggered
		};

		await submitAttempt({
			testSlug: 'letter',
			startedAt: new Date(testStartedAt).toISOString(),
			durationMs: Date.now() - testStartedAt,
			score: maxSpan,
			maxScore: LETTERS.length,
			normalizedScore: Math.min(100, Math.round((maxSpan / 10) * 100)),
			meta,
			answers: answerLog.map((round, index) => ({
				questionId: `round-${index + 1}`,
				answer: round.submitted,
				isCorrect: round.isCorrect,
				reactionTimeMs: round.reactionTimeMs,
				meta: {
					target: round.target,
					submitted: round.submitted,
					letterCount: round.letterCount
				}
			}))
		});
	}

	function verdict(span) {
		if (span >= 8) return { text: 'Отличный объём памяти', cls: 'good' };
		if (span >= 6) return { text: 'Хороший объём памяти', cls: 'good' };
		if (span >= 4) return { text: 'Средний объём памяти', cls: 'mid' };
		if (span >= 1) return { text: 'Низкий объём памяти', cls: 'bad' };
		return { text: 'Не удалось запомнить ни одной последовательности', cls: 'bad' };
	}
</script>

<div class="controls">
	<button type="button" on:click={startGame}>Старт</button>
</div>

{#if started && showing}
	<p class="targets">Запомните буквы!</p>
	<div class="results">
		<p>Показ: {showTime > 0 ? showTime : 0} сек</p>
		<p class="found">Букв: {lettersToShow.length}</p>
		<p>Время игры: {elapsed} сек</p>
	</div>
	<div class="grid show">
		{#each [...lettersToShow] as letter}
			<button type="button" disabled>{letter}</button>
		{/each}
	</div>
{:else if started}
	<div class="results">
		<p>Время: {elapsed} сек</p>
		<p class="found">Выбрано: {userAnswer.length} / {lettersToShow.length}</p>
		<p>{userAnswer.length ? userAnswer.join('') : '—'}</p>
	</div>
	<div class="grid">
		{#each gridLetters as letter}
			<button
				type="button"
				class:selected={userAnswer.includes(letter)}
				on:click={() => pick(letter)}
			>
				{letter}
			</button>
		{/each}
	</div>
	<div class="controls row">
		<button type="button" on:click={checkAnswer}>Далее</button>
		<button type="button" on:click={() => (userAnswer = [])}>Отменить</button>
	</div>
{:else if finished}
	<div class="results">
		<p class="found">Макс. span: {maxSpan}</p>
		<p>Время: {elapsed} сек</p>
		<p>Тест завершён</p>
	</div>
	<p class="verdict {verdict(maxSpan).cls}">
		<strong>Вывод:</strong> {verdict(maxSpan).text}
	</p>
	<div class="controls">
		<button type="button" on:click={restart}>Пройти заново</button>
	</div>
{/if}

<style>
	h1,
	p,
	label {
		color: #fff;
	}

	h1 {
		text-align: center;
		margin-bottom: 20px;
	}

	.controls,
	.grid,
	.targets {
		max-width: 900px;
		margin-inline: auto;
	}

	.results {
		display: grid;
		grid-template-columns: repeat(3, auto);
		gap: 15px;
		justify-content: center;
		margin-top: 20px;
		max-width: 900px;
		margin-inline: auto;
	}

	.results p {
		text-align: center;
		font-size: 1em;
		background-color: #364b6c;
		padding: 2em;
		border-radius: 8px;
		margin: 0;
		color: #fff;
	}

	.error {
		color: #ff4d4d !important;
		font-size: 1rem;
		font-weight: 600;
	}

	.found {
		color: #4caf50 !important;
		font-size: 1rem;
		font-weight: 600;
	}

	.targets {
		text-align: center;
		font-size: 1.2em;
		margin-top: 20px;
		color: white;
	}

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-bottom: 20px;
		padding: 20px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		backdrop-filter: blur(8px);
	}

	.verdict {
		max-width: 900px;
		margin-inline: auto;
		margin-top: 20px;
		text-align: center;
		font-size: 1.1em;
		padding: 1.2em 1.5em;
		border-radius: 12px;
		background-color: #364b6c;
		color: #fff;
	}

	.verdict.good {
		border: 2px solid #4caf50;
	}

	.verdict.mid {
		border: 2px solid #f0c040;
	}

	.verdict.bad {
		border: 2px solid #ff4d4d;
	}

	button {
		padding: 10px 14px;
		border: none;
		border-radius: 14px;
		cursor: pointer;
		font-size: 16px;
		transition: 0.2s;
		background: #fff;
		color: #0c1452;
		font-weight: 600;
	}

	button:hover:not(:disabled) {
		transform: scale(1.03);
	}

	button:disabled {
		opacity: 1;
		cursor: default;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
		gap: 12px;
		padding: 20px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		backdrop-filter: blur(8px);
		margin-top: 20px;
	}

	.grid.show {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	.grid.show button {
		min-width: 70px;
	}

	.grid button {
		background: white;
		color: #0c1452;
		font-weight: bold;
		min-height: 60px;
	}

	.controls p {
		margin: 0;
		line-height: 1.45;
	}

	.controls.row {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
	}

	.selected {
		background: #4caf50 !important;
		color: black !important;
	}
</style>
