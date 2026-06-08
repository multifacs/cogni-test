<script>
	// @ts-nocheck
	// Svelte 5 runes
	import { submitAttempt } from '$lib/tests/recordAttempt';

	const TOTAL_TRIALS = 50;
	const MAX_TEST_SECONDS = 120;

	let testStarted = $state(false);
	let testFinished = $state(false);
	let trials = $state([]);
	let currentTrial = $state(null);
	let correctAnswers = $state(0);
	let elapsedTime = $state(0);
	let timeLimit = $state(false);
	let intervalId = null;
	let layoutKey = $state(0);

	const trialIndex = $derived(TOTAL_TRIALS - trials.length);

	// Трекинг для статистики
	let testStartedAt = 0; // момент старта теста
	let trialShownAt = 0;  // момент показа текущего trial
	let answerLog = [];    // лог всех ответов

	function arrowSymbol(dir) {
		return dir === 'left' ? '←' : '→';
	}

	function isCongruent(trial) {
		const target = trial[2];
		return trial.every((d) => d === target);
	}

	function generateTrials() {
		const out = [];
		for (let i = 0; i < TOTAL_TRIALS; i++) {
			const center = Math.random() < 0.5 ? 'left' : 'right';
			const trial = [center, center, center, center, center];
			const n = Math.floor(Math.random() * 4);
			for (let k = 0; k < n; k++) {
				const j = Math.floor(Math.random() * 4);
				trial[j] = trial[j] === 'left' ? 'right' : 'left';
			}
			out.push(trial);
		}
		return out;
	}

	function stopTimer() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function startTest() {
		testStarted = true;
		testFinished = false;
		timeLimit = false;
		correctAnswers = 0;
		elapsedTime = 0;
		trials = generateTrials();
		currentTrial = trials.shift() ?? null;
		layoutKey++;
		testStartedAt = Date.now();
		trialShownAt = Date.now();
		answerLog = [];
		stopTimer();
		intervalId = setInterval(() => {
			elapsedTime++;
			if (elapsedTime >= MAX_TEST_SECONDS) {
				timeLimit = true;
				finishTest();
			}
		}, 1000);
	}

	function answer(dir) {
		if (testFinished || !currentTrial) return;
		const reactionTimeMs = Date.now() - trialShownAt;
		const target = currentTrial[2];
		const correct = dir === target;
		if (correct) correctAnswers++;
		answerLog.push({
			trial: [...currentTrial],
			target,
			selected: dir,
			isCorrect: correct,
			congruent: isCongruent(currentTrial),
			reactionTimeMs
		});
		if (trials.length) {
			currentTrial = trials.shift();
			layoutKey++;
			trialShownAt = Date.now();
		} else {
			finishTest();
		}
	}

	function finishTest() {
		if (testFinished) return;
		stopTimer();
		testFinished = true;
		currentTrial = null;
		void sendAttemptToServer();
	}

	function restartTest() {
		stopTimer();
		testStarted = false;
		testFinished = false;
		timeLimit = false;
		trials = [];
		currentTrial = null;
		correctAnswers = 0;
		elapsedTime = 0;
		layoutKey = 0;
		answerLog = [];
	}

	// Отправка результатов в БД через единый API
	async function sendAttemptToServer() {
		if (answerLog.length === 0) return; // нечего сохранять

		const congruentRts = answerLog.filter((a) => a.congruent).map((a) => a.reactionTimeMs);
		const incongruentRts = answerLog.filter((a) => !a.congruent).map((a) => a.reactionTimeMs);
		const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
		const avgRtCongruentMs = Math.round(avg(congruentRts));
		const avgRtIncongruentMs = Math.round(avg(incongruentRts));
		const errors = answerLog.filter((a) => !a.isCorrect).length;

		const meta = {
			trialsAttempted: answerLog.length,
			trialsPlanned: TOTAL_TRIALS,
			timeoutTriggered: timeLimit,
			avgRtCongruentMs,
			avgRtIncongruentMs,
			flankerEffectMs: avgRtIncongruentMs - avgRtCongruentMs,
			errors
		};

		await submitAttempt({
			testSlug: 'flanker',
			startedAt: new Date(testStartedAt).toISOString(),
			durationMs: Date.now() - testStartedAt,
			score: correctAnswers,
			maxScore: TOTAL_TRIALS,
			normalizedScore: Math.round((correctAnswers / TOTAL_TRIALS) * 100),
			meta,
			answers: answerLog.map((entry, index) => ({
				questionId: `trial-${index + 1}`,
				answer: entry.selected,
				isCorrect: entry.isCorrect,
				reactionTimeMs: entry.reactionTimeMs,
				meta: {
					target: entry.target,
					flankers: entry.trial,
					congruent: entry.congruent
				}
			}))
		});
	}

	function verdict(correct, total) {
		if (total === 0) return { text: 'Нет данных', cls: 'mid' };
		const pct = correct / total;
		if (pct >= 0.9) return { text: 'Отличная концентрация и скорость обработки', cls: 'good' };
		if (pct >= 0.75) return { text: 'Хорошая концентрация внимания', cls: 'good' };
		if (pct >= 0.6) return { text: 'Средний результат — есть куда расти', cls: 'mid' };
		return { text: 'Низкая точность, стоит потренироваться', cls: 'bad' };
	}
</script>

<div class="controls">
	<button type="button" on:click={startTest}>Старт</button>
</div>

{#if testStarted && !testFinished && currentTrial}
	<div class="results">
		<p>Время: {elapsedTime} сек</p>
		<p class="found">Испытание: {trialIndex} / {TOTAL_TRIALS}</p>
		<p class="found">Верно: {correctAnswers}</p>
	</div>

	{#key layoutKey}
		<div class="grid">
			{#each currentTrial as dir, index}
				<button type="button" disabled>{arrowSymbol(dir)}</button>
			{/each}
		</div>
	{/key}

	<div class="controls row">
		<button type="button" on:click={() => answer('left')}>← Влево</button>
		<button type="button" on:click={() => answer('right')}>Вправо →</button>
	</div>
{:else if testFinished}
	<div class="results">
		<p class="found">Правильных: {correctAnswers} / {TOTAL_TRIALS}</p>
		<p>Время: {elapsedTime} сек</p>
		{#if timeLimit}
			<p class="error">Время вышло</p>
		{:else}
			<p>Завершено</p>
		{/if}
	</div>
	<p class="verdict {verdict(correctAnswers, TOTAL_TRIALS).cls}">
		<strong>Вывод:</strong> {verdict(correctAnswers, TOTAL_TRIALS).text}
	</p>
	<div class="controls">
		<button type="button" on:click={restartTest}>Пройти заново</button>
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
		grid-template-columns: repeat(5, 1fr);
		gap: 12px;
		padding: 20px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		backdrop-filter: blur(8px);
		margin-top: 20px;
	}

	.grid button {
		background: white;
		color: #0c1452;
		font-weight: bold;
		min-height: 60px;
		font-size: 1.75rem;
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

</style>
