<script lang="ts">
	import { submitAttempt } from '$lib/tests/recordAttempt';
	import type { Memory1Meta } from '$lib/stats/contracts';

	type Option = {
		value: string;
		label: string;
		correct?: boolean;
	};

	type Question = {
		id: number;
		kind: 'binary' | 'choice' | 'observe';
		prompt: string;
		helper: string;
		image?: string;
		imageAlt?: string;
		options?: Option[];
		scored: boolean;
		buttonLabel?: string;
	};
	const calendarNumber = 4;
	const butterflyCount = 3;
	const cousinJacketColor = 'brown';
	const breakfastHadSpoon = false;
	const fatherSceneHadClouds = true;

	const binaryOptions: Option[] = [
		{ value: 'yes', label: 'Да' },
		{ value: 'no', label: 'Нет' }
	];

	const questions: Question[] = [
		{
			id: 1,
			kind: 'binary',
			prompt: 'Помните, какое сегодня число?',
			helper: 'Посмотрите на календарь и выберите один из двух вариантов.',
			image: '/tests/memory_1/calendar.jpeg',
			imageAlt: 'Календарь с обведенным числом',
			options: binaryOptions,
			scored: false,
		},
		{
			id: 2,
			kind: 'observe',
			prompt: 'Посмотрите на картинку',
			helper: 'Ничего отвечать не нужно.',
			image: '/tests/memory_1/butterfly.jpg',
			imageAlt: 'Картинка с несколькими бабочками',
			scored: false,
			buttonLabel: 'Я рассмотрел(а) картинку',
		},
		{
			id: 3,
			kind: 'choice',
			prompt: 'Какое число было обведено на первом вопросе?',
			helper: 'Выберите то число, которое вы запомнили на календаре.',
			options: [
				{ value: '6', label: '6'},
				{ value: '4', label: '4', correct: calendarNumber === 4},
				{ value: '3', label: '3'},
			],
			scored: true,
		},
		{
			id: 4,
			kind: 'binary',
			prompt: 'Помните, что вы вчера ели на завтрак?',
			helper: '',
			image: '/tests/memory_1/breakfast.jpg',
			imageAlt: 'Завтрак на столе',
			options: binaryOptions,
			scored: false,
		},
		{
			id: 5,
			kind: 'binary',
			prompt: 'Помните, сколько у вас двоюродных братьев и сестер?',
			helper: '',
			image: '/tests/memory_1/Women_jacket.png',
			imageAlt: 'Девушка в центре изображения',
			options: binaryOptions,
			scored: false,
		},
		{
			id: 6,
			kind: 'choice',
			prompt: 'Была ли ложка на картинке на четвертом вопросе?',
			helper: 'Постарайтесь вспомнить детали сцены с завтраком.',
			options: [
				{ value: 'yes', label: 'Да', correct: breakfastHadSpoon },
				{ value: 'no', label: 'Нет', correct: !breakfastHadSpoon }
			],
			scored: true,
		},
		{
			id: 7,
			kind: 'binary',
			prompt: 'Помните день рождения своего отца?',
			helper: '',
			image: '/tests/memory_1/father_and_clouds.jpg',
			imageAlt: 'Отец и сын на прогулке',
			options: binaryOptions,
			scored: false,
		},
		{
			id: 8,
			kind: 'choice',
			prompt: 'Какого цвета была куртка на девушке из пятого вопроса?',
			helper: 'Вспомните центральную фигуру на картинке.',
			options: [
				{ value: 'brown', label: 'Коричневая', correct: cousinJacketColor == 'brown' },
				{ value: 'yellow', label: 'Желтая'},
				{ value: 'red', label: 'Красная' }
			],
			scored: true,
		},
		{
			id: 9,
			kind: 'choice',
			prompt: 'На картинке из вопроса про день рождения отца были ли облака?',
			helper: 'Вспомните фон на изображении с отцом и сыном.',
			options: [
				{ value: 'yes', label: 'Да', correct: fatherSceneHadClouds },
				{ value: 'no', label: 'Нет', correct: !fatherSceneHadClouds }
			],
			scored: true,
		},
		{
			id: 10,
			kind: 'choice',
			prompt: 'Сколько бабочек было на картинке из второго вопроса?',
			helper: 'Постарайтесь вспомнить общее количество бабочек.',
			options: [
				{ value: '4', label: '4' },
				{ value: '3', label: '3', correct: butterflyCount === 3 },
				{ value: '8', label: '8' }
			],
			scored: true,
		}
	];

	const recallQuestions = questions.filter((question) => question.scored);

	let currentIndex = $state(0);
	let answers = $state<Record<number, string>>({});
	let finished = $state(false);

	// Трекинг для статистики
	let testStartedAt = $state(Date.now());
	let questionShownAt = $state(Date.now());
	let answerTimings = $state<Record<number, number>>({});

	const currentQuestion = () => questions[currentIndex];

	const optionForValue = (question: Question, value: string) =>
		question.options?.find((option) => option.value === value);

	const score = () =>
		recallQuestions.reduce((total, question) => {
			const selected = answers[question.id];

			if (!selected) {
				return total;
			}

			return optionForValue(question, selected)?.correct ? total + 1 : total;
		}, 0);

	const resultTone = () => {
		const ratio = score() / recallQuestions.length;

		if (ratio >= 0.8) {
			return {
				title: 'Сильный результат',
				description: 'Вы хорошо удержали детали изображений и вопросы на воспроизведение.'
			};
		}

		if (ratio >= 0.5) {
			return {
				title: 'Хорошая база',
				description: 'Часть деталей запомнилась уверенно, а часть можно дополнительно тренировать.'
			};
		}

		else return {
			title: 'Есть пространство для тренировки',
			description:
				'Попробуйте пройти тест еще раз позже и обращать больше внимания на мелкие детали.'
		};
	};

	const answerQuestion = (value: string) => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;

		answers = {
			...answers,
			[question.id]: value
		};
		answerTimings = {
			...answerTimings,
			[question.id]: reactionTimeMs
		};

		if (currentIndex < questions.length - 1) {
			currentIndex += 1;
			questionShownAt = Date.now();
		} else {
			finished = true;
			void sendAttemptToServer();
		}
	};

	const advanceObservation = () => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;

		answers = {
			...answers,
			[question.id]: 'seen'
		};
		answerTimings = {
			...answerTimings,
			[question.id]: reactionTimeMs
		};

		if (currentIndex < questions.length - 1) {
			currentIndex += 1;
			questionShownAt = Date.now();
		} else {
			finished = true;
			void sendAttemptToServer();
		}
	};

	const restart = () => {
		currentIndex = 0;
		answers = {};
		finished = false;
		testStartedAt = Date.now();
		questionShownAt = Date.now();
		answerTimings = {};
	};

	// Отправка результатов в БД через единый API
	const sendAttemptToServer = async () => {
		const correct = score();

		const meta: Memory1Meta = {
			recallQuestionIds: recallQuestions.map((question) => question.id)
		};

		await submitAttempt({
			testSlug: 'memory1',
			startedAt: new Date(testStartedAt).toISOString(),
			durationMs: Date.now() - testStartedAt,
			score: correct,
			maxScore: recallQuestions.length,
			normalizedScore: Math.round((correct / recallQuestions.length) * 100),
			meta,
			answers: questions.map((question) => {
				const selectedValue = answers[question.id];
				const option = selectedValue ? optionForValue(question, selectedValue) : undefined;
				return {
					questionId: String(question.id),
					answer: selectedValue ?? undefined,
					isCorrect: question.scored ? Boolean(option?.correct) : null,
					reactionTimeMs: answerTimings[question.id] ?? 0,
					meta: {
						kind: question.kind,
						scored: question.scored,
						prompt: question.prompt
					}
				};
			})
		});
	};

	const userAnswerLabel = (question: Question) => {
		const selected = answers[question.id];

		if (!selected) {
			return 'Нет ответа';
		}

		return optionForValue(question, selected)?.label ?? 'Просмотрено';
	};

	const correctAnswerLabel = (question: Question) =>
		question.options?.find((option) => option.correct)?.label ?? 'Не оценивается';
</script>

<svelte:head>
	<title>Тест памяти 1</title>
</svelte:head>

{#if !finished}
	<div class="memory-test-shell">
		<section class="memory-test-card">
			<div class="header-row">
				<div>
					<p class="eyebrow">Когнитивный тест</p>
				</div>
			</div>

			<div class="progress-block">
				<div class="progress-copy">
					<span>Вопрос {currentIndex + 1} из {questions.length}</span>

				</div>
				<div class="progress-track" aria-hidden="true">
					<div
						class="progress-value"
						style={`width: ${((currentIndex + 1) / questions.length) * 100}%`}
					></div>
				</div>
			</div>

			<div class="question-grid">
				<div class:image-frame={Boolean(currentQuestion().image)} class="visual-panel">
					{#if currentQuestion().image}
						<img src={currentQuestion().image} alt={currentQuestion().imageAlt ?? ''} />
					{:else}
						<div class="memory-callout">
							<p>Сосредоточьтесь на том, что вы уже видели раньше.</p>
							<span>Здесь важно воспроизведение деталей по памяти.</span>
						</div>
					{/if}
				</div>

				<div class="content-panel">
					<p class="question-index">Шаг {currentQuestion().id}</p>
					<h2>{currentQuestion().prompt}</h2>
					<p class="question-helper">{currentQuestion().helper}</p>

					{#if currentQuestion().kind === 'observe'}
						<button class="primary-button" type="button" onclick={advanceObservation}>
							{currentQuestion().buttonLabel}
						</button>
					{:else}
						<div class="answers-grid">
							{#each currentQuestion().options ?? [] as option (option.value)}
								<button
									class="answer-button"
									type="button"
									onclick={() => answerQuestion(option.value)}
								>
									<span>{option.label}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</section>
	</div>
{:else}
	<div class="memory-test-shell">
		<section class="memory-test-card result-card">
			<p class="eyebrow">Результат готов</p>
			<h1>{resultTone().title}</h1>
			<p class="result-description">{resultTone().description}</p>

			<div class="result-score">
				<div>
					<span class="score-label">Правильных ответов: </span>
					<strong>{score()} / {recallQuestions.length}</strong>
				</div>
			</div>

			<div class="review-grid">
				{#each recallQuestions as question (question.id)}
					<article class="review-card">
						<p class="review-title">{question.prompt}</p>
						<p class="review-line">Ваш ответ: {userAnswerLabel(question)}</p>
						<p class="review-line">Правильный ответ: {correctAnswerLabel(question)}</p>
					</article>
				{/each}
			</div>

			<div class="result-actions">
				<button class="primary-button" type="button" onclick={restart}>
					Пройти тест заново
				</button>
			</div>
		</section>
	</div>
{/if}

<style>
	.memory-test-shell {
		min-height: 100vh;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: 40px 20px;
		box-sizing: border-box;
	}

	.memory-test-card {
		width: 100%;
		max-width: 900px;
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

	/* Progress */
	.progress-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.progress-copy {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.progress-track {
		height: 6px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 99px;
		overflow: hidden;
	}

	.progress-value {
		height: 100%;
		background: white;
		border-radius: 99px;
		transition: width 0.3s ease;
	}

	/* Question layout */
	.question-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		align-items: start;
	}

	@media (max-width: 640px) {
		.question-grid {
			grid-template-columns: 1fr;
		}
	}

	.visual-panel {
		border-radius: 16px;
		min-height: 200px;
		max-height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		position: relative;
	}

	.image-frame {
		background: rgba(255, 255, 255, 0.05);
	}

	.visual-panel img {
		width: 100%;
		height: auto;
		max-height: 300px;
		object-fit: cover;
		display: block;
		border-radius: 16px;
	}

	.memory-callout {
		padding: 24px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		text-align: center;
		width: 100%;
	}

	.memory-callout p {
		color: white;
		font-size: 1rem;
		margin: 0 0 8px;
	}

	.memory-callout span {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
	}

	.content-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		position: relative;
		z-index: 1;
	}

	.question-index {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0;
	}

	.content-panel h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: white;
		margin: 0;
		line-height: 1.4;
	}

	.question-helper {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.55);
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

	.answers-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.answer-button {
		padding: 12px 18px;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 14px;
		font-size: 1rem;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s, transform 0.2s;
	}

	.answer-button:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.02);
	}

	/* Result */
	.result-card {
		max-width: 700px;
		margin-inline: auto;
	}

	.result-card h1 {
		font-size: 1.8rem;
		font-weight: 700;
		color: white;
		margin: 0;
	}

	.result-description {
		color: rgba(255, 255, 255, 0.65);
		font-size: 1rem;
		margin: 0;
	}

	.result-score {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 20px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.result-score strong {
		font-size: 2rem;
		font-weight: 700;
		color: white;
	}

	.score-label {
		font-size: 1.5rem;
		color: rgb(255, 255, 255);
		margin: 0 0 4px;
	}

	.review-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.review-card {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 14px;
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.review-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: white;
		margin: 0;
	}

	.review-line {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.55);
		margin: 0;
	}

	.result-actions {
		display: flex;
		justify-content: flex-start;
	}
</style>
