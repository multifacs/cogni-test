<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { PicturesTrialRow } from './types';

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
		sendResults: (results: PicturesTrialRow[]) => void;
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

	let currentIndex = $state(0);
	let answers = $state<Record<number, string>>({});
	let finished = $state(false);
	let questionShownAt = $state(Date.now());
	let answerTimings = $state<Record<number, number>>({});

	const currentQuestion = () => questions[currentIndex];

	const optionForValue = (question: Question, value: string) =>
		question.options?.find((o) => o.value === value);

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
			const trialRows: PicturesTrialRow[] = questions.map((q, i) => {
				const selectedValue = answers[q.id];
				const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
				return {
					questionIndex: i + 1,
					questionId: String(q.id),
					questionKind: q.kind,
					scored: q.scored,
					answer: selectedValue ?? null,
					isCorrect: q.scored ? Boolean(option?.correct) : null,
					reactionTimeMs: answerTimings[q.id] ?? 0
				};
			});
			sendResults(trialRows);
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
			const trialRows: PicturesTrialRow[] = questions.map((q, i) => {
				const selectedValue = answers[q.id];
				const option = selectedValue ? optionForValue(q, selectedValue) : undefined;
				return {
					questionIndex: i + 1,
					questionId: String(q.id),
					questionKind: q.kind,
					scored: q.scored,
					answer: selectedValue ?? null,
					isCorrect: q.scored ? Boolean(option?.correct) : null,
					reactionTimeMs: answerTimings[q.id] ?? 0
				};
			});
			sendResults(trialRows);
			gameEnd();
		}
	};
</script>

{#if !finished}
	<div class="progress-block mb-4 flex flex-col gap-2">
		<div class="progress-copy text-[0.9rem]">
			<span>Вопрос {currentIndex + 1} из {questions.length}</span>
		</div>
		<div class="progress-track h-1.5 bg-white rounded-full overflow-hidden" aria-hidden="true">
			<div
				class="progress-value h-full bg-[#6fcf97] rounded-full transition-[width] duration-300"
				style={`width: ${((currentIndex + 1) / questions.length) * 100}%`}
			></div>
		</div>
	</div>

	<div class="question-grid grid grid-cols-1 gap-6 items-start sm:grid-cols-2">
		<div
			class="visual-panel rounded-2xl min-h-[200px] max-h-[300px] flex items-center justify-center overflow-hidden relative"
		>
			{#if currentQuestion().image}
				<img
					class="w-full h-auto max-h-[300px] object-cover block rounded-2xl"
					src={currentQuestion().image}
					alt={currentQuestion().imageAlt ?? ''}
				/>
			{:else}
				<div class="memory-callout p-6 rounded-2xl text-center w-full">
					<p class="text-base mb-2">Сосредоточьтесь на том, что вы уже видели раньше.</p>
					<span class="text-[0.85rem]"
						>Здесь важно воспроизведение деталей по памяти.</span
					>
				</div>
			{/if}
		</div>

		<div class="content-panel flex flex-col gap-3 relative z-[1]">
			<p class="question-index text-[0.8rem] uppercase tracking-[0.1em] m-0">
				Шаг {currentQuestion().id}
			</p>
			<h2 class="text-center text-xl font-semibold m-0 leading-[1.4]">
				{currentQuestion().prompt}
			</h2>
			<p class="question-helper text-[0.9rem] m-0">{currentQuestion().helper}</p>

			{#if currentQuestion().kind === 'observe'}
				<Button color="green" onclick={advanceObservation}>
					{currentQuestion().buttonLabel}
				</Button>
			{:else}
				<div class="answers-grid flex flex-col gap-2.5">
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
