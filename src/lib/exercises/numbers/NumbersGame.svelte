<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { NumbersResult, LevelReview } from './types';

	type Phase = 'intro' | 'memorize' | 'input' | 'review' | 'finished';
	type LevelConfig = { level: number; count: number; mode: 'single' | 'mixed' };

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: NumbersResult[]) => void;
	} = $props();

	const studySeconds = 10;
	const levelConfigs: LevelConfig[] = Array.from({ length: 8 }, (_, index) => ({
		level: index + 1,
		count: index + 3,
		mode: index < 4 ? 'single' : 'mixed'
	}));

	let phase = $state<Phase>('intro');
	let currentLevelIndex = $state(0);
	let currentSequence = $state<number[]>([]);
	let recallInput = $state('');
	let countdown = $state(studySeconds);
	let validationMessage = $state('');
	let acceptedReviews = $state<LevelReview[]>([]);
	let currentReview = $state<LevelReview | null>(null);

	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let revealTimeout: ReturnType<typeof setTimeout> | null = null;

	const currentLevelNumber = () => currentLevelIndex + 1;
	const isLastLevel = () => currentLevelIndex === levelConfigs.length - 1;
	const correctLevels = () => acceptedReviews.filter((r) => r.isCorrect).length;

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
		if (config.mode === 'mixed') {
			if (!sequence.some((v) => v < 10))
				sequence[randomInt(0, sequence.length - 1)] = randomInt(1, 9);
			if (!sequence.some((v) => v >= 10))
				sequence[randomInt(0, sequence.length - 1)] = randomInt(10, 99);
		}
		return sequence;
	};

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
		}, studySeconds * 1000);
	};

	const startTest = () => {
		acceptedReviews = [];
		startLevel(0);
	};

	const repeatLevel = () => {
		startLevel(currentLevelIndex);
	};

	const updateInput = (value: string) => {
		recallInput = value.replace(/[^\d\s,;-]/g, '');
		validationMessage = '';
	};

	const submitLevel = () => {
		if (recallInput.trim() === '') {
			validationMessage = 'Введите всю последовательность чисел в одно поле.';
			return;
		}
		const parts = recallInput
			.trim()
			.split(/[\s,;]+/)
			.filter(Boolean);
		const submitted = parts.map((v) => Number(v));
		if (submitted.length !== currentSequence.length) {
			validationMessage = `Нужно ввести ${currentSequence.length} чисел в том же порядке.`;
			return;
		}
		if (submitted.some((v) => !Number.isInteger(v) || v < 1 || v > 99)) {
			validationMessage = 'Можно вводить только целые числа от 1 до 99.';
			return;
		}
		currentReview = {
			level: currentLevelNumber(),
			sequence: [...currentSequence],
			submitted,
			isCorrect: submitted.every((v, i) => v === currentSequence[i]),
			reactionTimeMs: 0
		};
		phase = 'review';
	};

	const continueAfterReview = () => {
		if (!currentReview) return;
		acceptedReviews = [...acceptedReviews, currentReview];
		if (isLastLevel()) {
			clearTimers();
			const digitSpan = acceptedReviews
				.filter((r) => r.isCorrect)
				.reduce((max, r) => Math.max(max, levelConfigs[r.level - 1].count), 0);
			const result: NumbersResult = {
				correct: correctLevels(),
				total: levelConfigs.length,
				digitSpan,
				reviews: acceptedReviews
			};
			sendResults([result]);
			gameEnd();
			return;
		}
		startLevel(currentLevelIndex + 1);
	};

	onDestroy(() => {
		clearTimers();
	});
</script>

{#if phase === 'intro'}
	<div class="flex flex-col items-center justify-center gap-4">
		<p class="text-justify text-lg">
			Последовательно проходите уровни, запоминайте числа и вводите их в том же порядке после
			исчезновения с экрана.
		</p>
		<div class="rounded-2xl bg-white/5 px-6 py-5">
			<h2 class="mb-3 text-base font-semibold text-white">Инструкция</h2>
			<ol class="flex list-disc flex-col gap-1.5 pl-5">
				<li class="text-base leading-normal text-white/70">
					Вам будут показаны числа, которые нужно запомнить.
				</li>
				<li class="text-base leading-normal text-white/70">
					Время на запоминание ограничено.
				</li>
				<li class="text-base leading-normal text-white/70">
					Сложность постепенно повышается.
				</li>
				<li class="text-base leading-normal text-white/70">
					После исчезновения чисел, введите их в том же порядке.
				</li>
			</ol>
		</div>
		<Button color="green" onclick={startTest}>Начать тест</Button>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center gap-4">
		<section class="flex w-full flex-col gap-6 rounded-3xl p-8 backdrop-blur-sm">
			<h1 class="text-3xl font-bold text-white">Уровень {currentLevelNumber()}</h1>

			{#key `${phase}-${currentLevelIndex}`}
				{#if phase === 'memorize'}
					<div
						class="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/5 p-6"
					>
						<div class="flex flex-col items-center justify-between gap-3">
							<h2 class="text-xl font-semibold text-white">Запомните числа</h2>
							<div
								class="min-w-[60px] rounded-full bg-white px-3.5 py-1 text-center text-sm font-bold whitespace-nowrap text-[#0c1452]"
							>
								{countdown} сек
							</div>
						</div>
						<p class="text-sm leading-normal text-white/50">
							Смотрите на последовательность до конца отсчета, затем введите ее в том
							же порядке.
						</p>
						<div
							class="flex flex-wrap gap-3"
							aria-label="Последовательность чисел для запоминания"
						>
							{#each currentSequence as value, index (index)}
								<div
									class="min-w-[52px] rounded-xl bg-white px-4 py-3 text-center text-2xl font-bold text-[#0c1452]"
								>
									{value}
								</div>
							{/each}
						</div>
					</div>
				{:else if phase === 'input'}
					<div class="flex flex-col gap-4 rounded-2xl bg-white/5 p-6">
						<div class="flex flex-col items-center justify-between gap-3">
							<h2 class="text-xl font-semibold text-white">
								Введите числа по порядку
							</h2>
							<div
								class="min-w-[60px] rounded-full bg-white/20 px-3.5 py-1 text-center text-sm font-normal whitespace-nowrap text-white/70"
							>
								Без ограничения
							</div>
						</div>
						<p class="text-sm leading-normal text-white/50">
							Порядок важен: введите всю последовательность в одно поле через пробел,
							запятую или точку с запятой.
						</p>
						<div class="flex flex-col gap-3">
							<label class="flex flex-col gap-2" for="sequence-input">
								<span class="text-sm text-white/50"
									>Последовательность из {currentSequence.length} чисел</span
								>
								<input
									id="sequence-input"
									type="text"
									inputmode="text"
									placeholder="Например: 7 12 4"
									value={recallInput}
									oninput={(e) =>
										updateInput((e.currentTarget as HTMLInputElement).value)}
									class="rounded-xl border border-white/20 bg-white/10 p-3 px-4 text-base text-white transition-colors duration-200 outline-none placeholder:text-white/30 focus:border-white/50"
								/>
							</label>
						</div>
						{#if validationMessage}<p class="text-sm text-red-300">
								{validationMessage}
							</p>{/if}
						<Button color="green" onclick={submitLevel}>Проверить уровень</Button>
					</div>
				{/if}
			{/key}
		</section>

		{#if phase === 'review' && currentReview}
			<div
				class="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
				role="presentation"
			>
				<div
					class="flex w-full max-w-xl flex-col items-center justify-center gap-5 rounded-3xl border border-white/10 bg-[#111e6c] p-8 shadow-2xl"
					role="dialog"
					aria-modal="true"
				>
					<h2 class="text-2xl font-bold text-white">Уровень {currentReview.level}</h2>
					<p
						class="text-sm {currentReview.isCorrect
							? 'text-green-200'
							: 'text-red-300'}"
					>
						{currentReview.isCorrect
							? 'Вы ввели всю последовательность без ошибок.'
							: 'В последовательности есть ошибки.'}
					</p>
					<div class="grid grid-cols-2 gap-5">
						<div>
							<h3
								class="mb-2.5 text-sm font-medium tracking-widest text-white/50 uppercase"
							>
								Исходные числа
							</h3>
							<div class="flex flex-wrap gap-2">
								{#each currentReview.sequence as value, idx (idx)}
									<div
										class="rounded-lg bg-white/10 px-3.5 py-2 text-lg font-semibold text-white"
									>
										{value}
									</div>
								{/each}
							</div>
						</div>
						<div>
							<h3
								class="mb-2.5 text-sm font-medium tracking-widest text-white/50 uppercase"
							>
								Ваш ввод
							</h3>
							<div class="flex flex-wrap gap-2">
								{#each currentReview.submitted as value, idx (idx)}
									<div
										class="rounded-lg px-3.5 py-2 text-lg font-semibold {value ===
										currentReview.sequence[idx]
											? 'bg-green-500/35 text-green-200'
											: 'bg-red-500/30 text-red-300'}"
									>
										{value}
									</div>
								{/each}
							</div>
						</div>
					</div>
					<div class="flex gap-3">
						<Button color="red" onclick={repeatLevel}>Повторить</Button>
						<Button color="green" onclick={continueAfterReview}>
							{isLastLevel() ? 'Завершить' : 'Продолжить'}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
