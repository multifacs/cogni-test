<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { PicturesResult, AnswerRecord } from './types';

	type Option = { value: string; label: string; correct?: boolean };
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

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: PicturesResult[]) => void;
	} = $props();

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
			image: '/exercises/pictures/calendar.jpeg',
			imageAlt: 'Календарь с обведенным числом',
			options: binaryOptions,
			scored: false
		},
		{
			id: 2,
			kind: 'observe',
			prompt: 'Посмотрите на картинку',
			helper: 'Ничего отвечать не нужно.',
			image: '/exercises/pictures/butterfly.jpg',
			imageAlt: 'Картинка с несколькими бабочками',
			scored: false,
			buttonLabel: 'Я рассмотрел(а) картинку'
		},
		{
			id: 3,
			kind: 'choice',
			prompt: 'Какое число было обведено на первом вопросе?',
			helper: 'Выберите то число, которое вы запомнили на календаре.',
			options: [
				{ value: '6', label: '6' },
				{ value: '4', label: '4', correct: calendarNumber === 4 },
				{ value: '3', label: '3' }
			],
			scored: true
		},
		{
			id: 4,
			kind: 'binary',
			prompt: 'Помните, что вы вчера ели на завтрак?',
			helper: '',
			image: '/exercises/pictures/breakfast.jpg',
			imageAlt: 'Завтрак на столе',
			options: binaryOptions,
			scored: false
		},
		{
			id: 5,
			kind: 'binary',
			prompt: 'Помните, сколько у вас двоюродных братьев и сестер?',
			helper: '',
			image: '/exercises/pictures/Women_jacket.png',
			imageAlt: 'Девушка в центре изображения',
			options: binaryOptions,
			scored: false
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
			scored: true
		},
		{
			id: 7,
			kind: 'binary',
			prompt: 'Помните день рождения своего отца?',
			helper: '',
			image: '/exercises/pictures/father_and_clouds.jpg',
			imageAlt: 'Отец и сын на прогулке',
			options: binaryOptions,
			scored: false
		},
		{
			id: 8,
			kind: 'choice',
			prompt: 'Какого цвета была куртка на девушке из пятого вопроса?',
			helper: 'Вспомните центральную фигуру на картинке.',
			options: [
				{ value: 'brown', label: 'Коричневая', correct: cousinJacketColor == 'brown' },
				{ value: 'yellow', label: 'Желтая' },
				{ value: 'red', label: 'Красная' }
			],
			scored: true
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
			scored: true
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
			scored: true
		}
	];

	const recallQuestions = questions.filter((q) => q.scored);

	let currentIndex = $state(0);
	let answers = $state<Record<number, string>>({});
	let finished = $state(false);
	let questionShownAt = $state(Date.now());
	let answerTimings = $state<Record<number, number>>({});

	const currentQuestion = () => questions[currentIndex];

	const optionForValue = (question: Question, value: string) =>
		question.options?.find((o) => o.value === value);

	const score = () =>
		recallQuestions.reduce((total, question) => {
			const selected = answers[question.id];
			if (!selected) return total;
			return optionForValue(question, selected)?.correct ? total + 1 : total;
		}, 0);

	const answerQuestion = (value: string) => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;
		answers = { ...answers, [question.id]: value };
		answerTimings = { ...answerTimings, [question.id]: reactionTimeMs };
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			questionShownAt = Date.now();
		} else {
			finished = true;
			sendResults([
				{
					score: score(),
					maxScore: recallQuestions.length,
					normalizedScore: Math.round((score() / recallQuestions.length) * 100),
					answers: questions.map((q) => {
						const selectedValue = answers[q.id];
						const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
						return {
							questionId: String(q.id),
							answer: selectedValue ?? undefined,
							isCorrect: q.scored ? Boolean(option?.correct) : null,
							reactionTimeMs: answerTimings[q.id] ?? 0
						};
					})
				}
			]);
			gameEnd();
		}
	};

	const advanceObservation = () => {
		const question = currentQuestion();
		const reactionTimeMs = Date.now() - questionShownAt;
		answers = { ...answers, [question.id]: 'seen' };
		answerTimings = { ...answerTimings, [question.id]: reactionTimeMs };
		if (currentIndex < questions.length - 1) {
			currentIndex++;
			questionShownAt = Date.now();
		} else {
			finished = true;
			sendResults([
				{
					score: score(),
					maxScore: recallQuestions.length,
					normalizedScore: Math.round((score() / recallQuestions.length) * 100),
					answers: []
				}
			]);
			gameEnd();
		}
	};
</script>

{#if !finished}
	<div class="progress-block mb-4">
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
				<Button color="green" onclick={advanceObservation}>
					{currentQuestion().buttonLabel}
				</Button>
			{:else}
				<div class="answers-grid">
					{#each currentQuestion().options ?? [] as option (option.value)}
						<Button color="blue" onclick={() => answerQuestion(option.value)}>
							{option.label}
						</Button>
					{/each}
				</div>
			{/if}
		</div>
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

	.answers-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

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

	.result-actions {
		display: flex;
		justify-content: flex-start;
	}
</style>
