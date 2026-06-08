<script lang="ts">
	import { onDestroy } from 'svelte';
	import { submitAttempt } from '$lib/tests/recordAttempt';
	import type { NumberMemoryMeta } from '$lib/stats/contracts';
//Ключевая переменная
	type Phase = 'intro' | 'memorize' | 'input' | 'review' | 'finished';
//Структура одного уровня
	type LevelConfig = {
		level: number;
		count: number;
		mode: 'single' | 'mixed';
	};
//описание рез-та одного уровня
	type LevelReview = {
		level: number;
		sequence: number[];
		submitted: number[];
		isCorrect: boolean;
		reactionTimeMs: number;
	};

//настройка теста
	const studySeconds = 10;
	const levelConfigs: LevelConfig[] = Array.from({ length: 8 }, (_, index) => ({
		level: index + 1,
		count: index + 3,
		mode: index < 4 ? 'single' : 'mixed'
	}));

	let phase = $state<Phase>('intro');
	let currentLevelIndex = $state(0);
	let currentSequence = $state<number[]>([]);
	let recallInput = $state(''); //что вводит пользователь одной строкой
	let countdown = $state(studySeconds);
	let validationMessage = $state('');
	let acceptedReviews = $state<LevelReview[]>([]); //сколько завершено уровней
	let currentReview = $state<LevelReview | null>(null); //результат уровня

	let countdownInterval: ReturnType<typeof setInterval> | null = null;//повторяющийся таймер
	let revealTimeout: ReturnType<typeof setTimeout> | null = null;//одноразовный таймер

	// Трекинг для статистики
	let testStartedAt = 0; // timestamp начала теста (от первого startTest)
	let inputStartedAt = 0; // timestamp начала input-фазы текущего уровня (для reactionTime)

//helper функции

	const currentLevelNumber = () => currentLevelIndex + 1; //возвращаем текущий уровень
	const isLastLevel = () => currentLevelIndex === levelConfigs.length - 1;
	const correctLevels = () => acceptedReviews.filter((review) => review.isCorrect).length;

//генерируем случайное число
	const randomInt = (min: number, max: number) =>
		Math.floor(Math.random() * (max - min + 1)) + min;

	const clearTimers = () => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}

		if (revealTimeout) {
			clearTimeout(revealTimeout);
			revealTimeout = null;
		}
	};

	const createSequence = (config: LevelConfig) => {
		const sequence = Array.from({ length: config.count }, () =>
			config.mode === 'single' ? randomInt(1, 9) : randomInt(1, 99)
		);

//условия, чтобы поздние уровни могли быть 100% смешанными
		if (config.mode === 'mixed') {
			if (!sequence.some((value) => value < 10)) {
				sequence[randomInt(0, sequence.length - 1)] = randomInt(1, 9);
			}

			if (!sequence.some((value) => value >= 10)) {
				sequence[randomInt(0, sequence.length - 1)] = randomInt(10, 99);
			}
		}

		return sequence;
	};

//сбрасываем строку ввода
	const resetInput = () => {
		recallInput = '';
	};

	const startLevel = (levelIndex: number) => {
		clearTimers();
		currentLevelIndex = levelIndex;
		currentSequence = createSequence(levelConfigs[levelIndex]);
		resetInput();
		countdown = studySeconds;
		validationMessage = '';
		currentReview = null;
		phase = 'memorize';

		countdownInterval = setInterval(() => {
			countdown = Math.max(countdown - 1, 0);
		}, 1000);

		revealTimeout = setTimeout(() => {
			clearTimers();
			phase = 'input';
			inputStartedAt = Date.now();
		}, studySeconds * 1000);
	};

//начинаем тест с первого уровня
	const startTest = () => {
		acceptedReviews = [];
		testStartedAt = Date.now();
		startLevel(0);
	};

//сброс теста
	const restartTest = () => {
		clearTimers();
		phase = 'intro';
		currentLevelIndex = 0;
		currentSequence = [];
		recallInput = '';
		countdown = studySeconds;
		validationMessage = '';
		currentReview = null;
		acceptedReviews = [];
	};
//запуск текущего уровня заново
	const repeatLevel = () => {
		startLevel(currentLevelIndex);
	};

//обновляем строку ввода
	const updateInput = (value: string) => {
		recallInput = value.replace(/[^\d\s,;-]/g, '');
		validationMessage = '';
	};

//функция проверки ответа
	const submitLevel = () => {
		if (recallInput.trim() === '') {
			validationMessage = 'Введите всю последовательность чисел в одно поле.';
			return;
		}

		const parts = recallInput.trim().split(/[\s,;]+/).filter(Boolean);
		const submitted = parts.map((value) => Number(value));

		if (submitted.length !== currentSequence.length) {
			validationMessage = `Нужно ввести ${currentSequence.length} чисел в том же порядке.`;
			return;
		}

		if (submitted.some((value) => !Number.isInteger(value) || value < 1 || value > 99)) {
			validationMessage = 'Можно вводить только целые числа от 1 до 99.';
			return;
		}

		currentReview = {
			level: currentLevelNumber(),
			sequence: [...currentSequence],//..., чтобы сохранить именно копию массива
			submitted,
			isCorrect: submitted.every((value, index) => value === currentSequence[index]),//проверяем строгий порядок
			reactionTimeMs: inputStartedAt > 0 ? Date.now() - inputStartedAt : 0
		};
		phase = 'review';
	};

	const continueAfterReview = () => {
		if (!currentReview) {
			return;
		}

		acceptedReviews = [...acceptedReviews, currentReview];

		if (isLastLevel()) {
			clearTimers();
			phase = 'finished';
			void sendAttemptToServer();
			return;
		}

		startLevel(currentLevelIndex + 1);
	};

	// Отправка результатов в БД через единый API
	const sendAttemptToServer = async () => {
		const correct = correctLevels();
		const digitSpan = acceptedReviews
			.filter((review) => review.isCorrect)
			.reduce((max, review) => Math.max(max, levelConfigs[review.level - 1].count), 0);

		const meta: NumberMemoryMeta = {
			digitSpan,
			levelConfigs
		};

		await submitAttempt({
			testSlug: 'memory2',
			startedAt: new Date(testStartedAt).toISOString(),
			durationMs: Date.now() - testStartedAt,
			score: correct,
			maxScore: levelConfigs.length,
			normalizedScore: Math.round((correct / levelConfigs.length) * 100),
			meta,
			answers: acceptedReviews.map((review) => ({
				questionId: `level-${review.level}`,
				answer: review.submitted.join(' '),
				isCorrect: review.isCorrect,
				reactionTimeMs: review.reactionTimeMs,
				meta: {
					target: review.sequence,
					submitted: review.submitted,
					count: review.sequence.length,
					mode: levelConfigs[review.level - 1].mode
				}
			}))
		});
	};

//совпало ли число пользователя с правильным числом
	const reviewMatch = (index: number) =>
		currentReview ? currentReview.sequence[index] === currentReview.submitted[index] : false;

	onDestroy(() => {
		clearTimers();
	});
</script>

<svelte:head>
	<title>Тест на запоминание чисел</title>
</svelte:head>

{#if phase === 'intro'}
	<div class="number-test-shell">
		<section class="number-test-card intro-card">
			<p class="eyebrow">Когнитивный тест</p>
			<h1>Тест на запоминание чисел</h1>
			<p class="lead">
				Последовательно проходите уровни, запоминайте числа и вводите их в том же порядке после
				исчезновения с экрана.
			</p>

			<div class="instruction-card">
				<h2>Инструкция</h2>
				<ol>
					<li>Вам будут показаны числа, которые нужно запомнить.</li>
					<li>Время на запоминание ограничено.</li>
					<li>Сложность постепенно повышается.</li>
					<li>После исчезновения чисел, введите их в том же порядке.</li>
				</ol>
			</div>

			<button class="primary-button" type="button" onclick={startTest}>
				Начать тест
			</button>
		</section>
	</div>
{:else if phase === 'finished'}
	<div class="number-test-shell">
		<section class="number-test-card result-card">
			<p class="eyebrow">Тест завершен</p>
			<h1>Тест на запоминание чисел пройден</h1>
			<p class="lead">
				Верно завершено {correctLevels()} из {levelConfigs.length} уровней.
			</p>

			<div class="summary-grid">
				{#each acceptedReviews as review (review.level)}
					<article class="summary-card">
						<div class="summary-topline">
							<strong>Уровень {review.level}</strong>
							<span class:success-tone={review.isCorrect} class:error-tone={!review.isCorrect}>
								{review.isCorrect ? 'Без ошибок' : 'Есть ошибки'}
							</span>
						</div>
						<p>Исходные числа: {review.sequence.join(' - ')}</p>
						<p>Ваш ввод: {review.submitted.join(' - ')}</p>
					</article>
				{/each}
			</div>

			<button class="primary-button" type="button" onclick={restartTest}>
				Пройти тест заново
			</button>
		</section>
	</div>
{:else}
	<div class="number-test-shell">
		<section class="number-test-card">
			<div class="header-row">
				<div>
					<p class="eyebrow">Тест на запоминание чисел</p>
					<h1>Уровень {currentLevelNumber()}</h1>
				</div>
			</div>

			{#key `${phase}-${currentLevelIndex}`}
				{#if phase === 'memorize'}
					<div class="stage-card">
						<div class="stage-topline">
							<h2>Запомните числа</h2>
							<div class="timer-chip">{countdown} сек</div>
						</div>
						<p class="stage-copy">
							Смотрите на последовательность до конца отсчета, затем введите ее в том же порядке.
						</p>
						<div class="number-grid" aria-label="Последовательность чисел для запоминания">
							{#each currentSequence as value, index (index)}
								<div class="number-chip">{value}</div>
							{/each}
						</div>
					</div>
				{:else if phase === 'input'}
					<div class="stage-card">
						<div class="stage-topline">
							<h2>Введите числа по порядку</h2>
							<div class="timer-chip timer-chip-static">Без ограничения</div>
						</div>
						<p class="stage-copy">
							Порядок важен: введите всю последовательность в одно поле через пробел, запятую
							или точку с запятой.
						</p>

						<div class="input-grid">
							<label class="input-card single-input-card" for="sequence-input">
								<span>Последовательность из {currentSequence.length} чисел</span>
								<input
									id="sequence-input"
									type="text"
									inputmode="text"
									placeholder="Например: 7 12 4"
									value={recallInput}
									oninput={(event) =>
										updateInput((event.currentTarget as HTMLInputElement).value)}
								/>
							</label>
						</div>

						{#if validationMessage}
							<p class="validation-message">{validationMessage}</p>
						{/if}

						<button class="primary-button" type="button" onclick={submitLevel}>
							Проверить уровень
						</button>
					</div>
				{/if}
			{/key}
		</section>

		{#if phase === 'review' && currentReview}
			<div class="review-overlay" role="presentation">
				<div class="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
					<p class="eyebrow">Сверка уровня</p>
					<h2 id="review-title">Уровень {currentReview.level}</h2>
					<p class:success-tone={currentReview.isCorrect} class:error-tone={!currentReview.isCorrect}>
						{currentReview.isCorrect
							? 'Вы ввели всю последовательность без ошибок.'
							: 'В последовательности есть ошибки. Можно перейти дальше или повторить уровень.'}
					</p>

					<div class="review-columns">
						<div class="review-panel">
							<h3>Исходные числа</h3>
							<div class="review-chip-grid">
								{#each currentReview.sequence as value, index (index)}
									<div class="review-chip">{value}</div>
								{/each}
							</div>
						</div>

						<div class="review-panel">
							<h3>Ваш ввод</h3>
							<div class="review-chip-grid">
								{#each currentReview.submitted as value, index (index)}
									<div class:chip-match={reviewMatch(index)} class:chip-miss={!reviewMatch(index)} class="review-chip">
										{value}
									</div>
								{/each}
							</div>
						</div>
					</div>

					<div class="review-actions">
						<button class="secondary-button" type="button" onclick={repeatLevel}>
							Повторить уровень
						</button>
						<button class="primary-button" type="button" onclick={continueAfterReview}>
							{isLastLevel() ? 'Завершить тест' : 'Продолжить тест'}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Shell & Card */
	.number-test-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		padding: 40px 20px;
		box-sizing: border-box;
		gap: 24px;
	}

	.number-test-card {
		width: 100%;
		max-width: 820px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		backdrop-filter: blur(8px);
		padding: 32px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.eyebrow {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.number-test-card h1 {
		font-size: 1.8rem;
		font-weight: 700;
		color: white;
		margin: 0;
	}

	.lead {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.65);
		margin: 0;
		line-height: 1.6;
	}

	/* Intro */
	.instruction-card {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		padding: 20px 24px;
	}

	.instruction-card h2 {
		font-size: 1rem;
		font-weight: 600;
		color: white;
		margin: 0 0 12px;
	}

	.instruction-card ol {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.instruction-card li {
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	/* Header row (game phases) */
	.header-row {
		display: flex;
		align-items: flex-start;
	}

	.header-row h1 {
		font-size: 1.4rem;
		margin: 4px 0 0;
	}

	/* Stage card */
	.stage-card {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 18px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.stage-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.stage-topline h2 {
		font-size: 1.2rem;
		font-weight: 600;
		color: white;
		margin: 0;
	}

	.timer-chip {
		font-size: 0.9rem;
		font-weight: 700;
		color: #0c1452;
		background: white;
		border-radius: 99px;
		padding: 4px 14px;
		white-space: nowrap;
		min-width: 60px;
		text-align: center;
	}

	.timer-chip-static {
		background: rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.7);
		font-weight: 400;
	}

	.stage-copy {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.55);
		margin: 0;
		line-height: 1.5;
	}

	/* Number grid (memorize phase) */
	.number-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.number-chip {
		background: white;
		color: #0c1452;
		font-size: 1.4rem;
		font-weight: 700;
		border-radius: 14px;
		padding: 12px 18px;
		min-width: 52px;
		text-align: center;
	}

	/* Input phase */
	.input-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.input-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.input-card span {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.input-card input {
		padding: 12px 16px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.08);
		color: white;
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.input-card input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.input-card input:focus {
		border-color: rgba(255, 255, 255, 0.5);
	}

	.validation-message {
		font-size: 0.875rem;
		color: #ff8a8a;
		margin: 0;
	}

	/* Buttons */
	.primary-button {
		padding: 12px 24px;
		background: white;
		color: #0c1452;
		border: none;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, opacity 0.2s;
		align-self: flex-start;
	}

	.primary-button:hover {
		transform: scale(1.03);
		opacity: 0.92;
	}

	.secondary-button {
		padding: 12px 24px;
		background: transparent;
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s, transform 0.2s;
	}

	.secondary-button:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: scale(1.02);
	}

	/* Review overlay */
	.review-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 100;
	}

	.review-modal {
		background: #111e6c;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 24px;
		padding: 32px;
		width: 100%;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	.review-modal h2 {
		font-size: 1.4rem;
		font-weight: 700;
		color: white;
		margin: 0;
	}

	.review-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.review-panel h3 {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 10px;
		font-weight: 500;
	}

	.review-chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.review-chip {
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: 10px;
		padding: 8px 14px;
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.chip-match {
		background: rgba(76, 175, 80, 0.35);
		color: #a5f3a8;
	}

	.chip-miss {
		background: rgba(244, 67, 54, 0.3);
		color: #ffaaaa;
	}

	.review-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	/* Finish / summary */
	.summary-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.summary-card {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 14px;
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.summary-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.summary-topline strong {
		color: white;
		font-size: 0.95rem;
	}

	.summary-card p {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.55);
		margin: 0;
	}

	.success-tone {
		color: #a5f3a8;
		font-size: 0.875rem;
	}

	.error-tone {
		color: #ffaaaa;
		font-size: 0.875rem;
	}
</style>
