<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import IntervalWorker from '$lib/workers/interval_worker.ts?worker';
	import { shuffle } from '$lib/utils';
	import { isSubscribed } from '$lib/utils/push';
	import { pushService } from '$lib/pushService';
	import { adjectives, nouns } from './logic/data';
	import localforage from 'localforage';
	import type { WordMorphingSession } from './types';

	// Добавляем выбор категории
	let category: 'words' | 'shapes' = $state('words');

	// Добавляем выбор времени
	type TimeOption = {
		name: string;
		seconds: number;
	};

	const timeOptions: TimeOption[] = [
		{ name: 'Быстрый (30 сек)', seconds: 30 },
		{ name: 'Средний (10 мин)', seconds: 600 },
		{ name: 'Долгий (1 час)', seconds: 3600 },
		{ name: 'Кастомный', seconds: 0 } // Особый случай
	];

	let subscribed = $state(false);
	let showModal = $state(false);

	// Веб воркер для отслеживания интервала
	// Нужно, для корректной работы таймера, когда страница не в фокусе
	let intervalWorker = new IntervalWorker();
	intervalWorker.onmessage = (e) => {
		if (e.data === 'tick') {
			currentTime = Date.now();
			if (timerEndsAt && currentTime >= timerEndsAt) {
				intervalWorker.postMessage('stop');
				intervalWorker.terminate();
				phase = 'recall';
				timerEndsAt = null;
				showLocalNotification();
			}
		}
	};

	let { data } = $props();

	let selectedTimeOption: TimeOption = $state(timeOptions[0]);
	let customTimeInSeconds = $state(60); // По умолчанию 1 минута
	let customTimeInput = $state('1'); // Для ввода в минутах

	// Данные для слов
	let originalAdjective = $state('');
	let originalNoun = $state('');
	let currentAdj = $state('');
	let currentNoun = $state('');
	let adjectiveChoices = $state(['громкий', 'сетчатый', 'яркий', 'скучный']);
	let nounChoices = $state(['подвал', 'эклер', 'телефон', 'рука']);

	// Данные для фигур и цветов
	type Shape = {
		name: string;
		render: (color: string) => string;
	};

	type Color = {
		name: string;
		value: string;
	};

	const shapes: Shape[] = [
		{
			name: 'круг',
			render: (color) => `<circle cx="50" cy="50" r="40" fill="${color}" />`
		},
		{
			name: 'квадрат',
			render: (color) => `<rect x="10" y="10" width="80" height="80" fill="${color}" />`
		},
		{
			name: 'треугольник',
			render: (color) => `<polygon points="50,10 10,90 90,90" fill="${color}" />`
		},
		{
			name: 'ромб',
			render: (color) => `<polygon points="50,10 90,50 50,90 10,50" fill="${color}" />`
		},
		{
			name: 'овал',
			render: (color) => `<ellipse cx="50" cy="50" rx="45" ry="30" fill="${color}" />`
		},
		{
			name: 'прямоугольник',
			render: (color) => `<rect x="10" y="25" width="80" height="50" fill="${color}" />`
		}
	];

	const colors: Color[] = [
		{ name: 'красный', value: '#FF0000' },
		{ name: 'синий', value: '#0000FF' },
		{ name: 'зеленый', value: '#00AA00' },
		{ name: 'желтый', value: '#FFCC00' },
		{ name: 'оранжевый', value: '#FFA500' },
		{ name: 'фиолетовый', value: '#800080' }
	];

	let originalShape: Shape = $state(shapes[0]);
	let originalColor: Color = $state(colors[0]);
	let currentShape: Shape = $state(shapes[0]);
	let currentColor: Color = $state(colors[0]);
	let shapeChoices: Shape[] = $state(shapes.slice(0, 4));
	let colorChoices: Color[] = $state(colors.slice(0, 4));

	let phase:
		| 'category-select'
		| 'time-select'
		| 'initial'
		| 'replace-adj'
		| 'replace-noun'
		| 'wait'
		| 'recall'
		| 'result' = $state('category-select');

	let recalledCombos: string[] = $state([]);
	let input1 = $state('');
	let input2 = $state('');
	let input3 = $state('');

	let countdown = $state(30);
	let timerEndsAt = $state<number | null>(null);
	let currentTime = $state(Date.now());
	let timeInterval: ReturnType<typeof setInterval> | null = null;

	// Функция для обработки изменения кастомного времени
	function handleCustomTimeChange() {
		const minutes = parseFloat(customTimeInput);
		if (!isNaN(minutes) && minutes > 0) {
			customTimeInSeconds = Math.round(minutes * 60);
		}
	}

	// Функция для форматирования времени в удобный вид
	function formatTime(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else if (minutes > 0) {
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		} else {
			return `${seconds}`;
		}
	}

	// Функция для отправки локального уведомления
	async function showLocalNotification() {
		if ('Notification' in window) {
			// Запрашиваем разрешение, если еще не получено
			if (Notification.permission === 'default') {
				await Notification.requestPermission();
			}

			// Показываем уведомление, если разрешено
			if (Notification.permission === 'granted') {
				new Notification('Время вышло!', {
					body: 'Пора вспомнить сочетания.',
					icon: '/icon.png',
					tag: 'word-morphing-timer' // Тег для замены предыдущих уведомлений
				});
			}
		}
	}

	async function subscribe() {
		if (!pushService) {
			console.error('Push service not initialized');
			return;
		}

		try {
			await pushService.subscribe();
			subscribed = true;
			showModal = false;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}

	function selectCategory(selected: 'words' | 'shapes') {
		category = selected;
		phase = 'time-select';
	}

	async function selectTime(timeOption: TimeOption){
		selectedTimeOption = timeOption;
		if (timeOption.name !== 'Кастомный') {
			prepareData();
			phase = 'initial';
		}
	}

	function confirmCustomTime() {
		handleCustomTimeChange();
		prepareData();
		phase = 'initial';
	}

	function prepareData() {
		if (category === 'words') {
			// Перемешиваем и выбираем уникальные слова
			shuffle(adjectives);
			shuffle(nouns);

			originalAdjective = adjectives[0];
			currentAdj = originalAdjective;
			adjectiveChoices = adjectives.slice(1, 6);

			originalNoun = nouns[0];
			currentNoun = originalNoun;
			nounChoices = nouns.slice(1, 6);
		} else {
			// Перемешиваем и выбираем уникальные фигуры и цвета
			const shuffledShapes = [...shapes];
			const shuffledColors = [...colors];
			shuffle(shuffledShapes);
			shuffle(shuffledColors);

			originalShape = shuffledShapes[0];
			currentShape = originalShape;
			shapeChoices = shuffledShapes.slice(1, 6);

			originalColor = shuffledColors[0];
			currentColor = originalColor;
			colorChoices = shuffledColors.slice(1, 6);
		}
	}

	async function nextPhase() {
		if (phase === 'initial') phase = 'replace-adj';
		else if (phase === 'replace-adj') phase = 'replace-noun';
		else if (phase === 'replace-noun') {
			phase = 'wait';
			// Устанавливаем время на основе выбранной опции
			const waitTime =
				selectedTimeOption.name === 'Кастомный'
					? customTimeInSeconds
					: selectedTimeOption.seconds;
			
			setExpectedCombos();

			// Calculate timer end time (Unix timestamp in milliseconds)
			const now = Date.now();
			timerEndsAt = now + waitTime * 1000;
			currentTime = now;

			// Save session to localforage
			// Create a plain object with a copy of the array to avoid DataCloneError
			const session: WordMorphingSession = {
				timerEndsAt,
				expectedCombos: [...expectedCombos], // Create a plain array copy
				category
			};
			await localforage.setItem('wordMorphingSession', session);

			// Schedule notifications: web push if online and subscribed, local as fallback
			const isOnline = navigator.onLine;
			
			if (isOnline && subscribed) {
				// Schedule web push notification
				try {
					// Get current subscription to send endpoint
					const subscription = await pushService.getSubscription();
					if (subscription) {
						await fetch('/api/push/schedule', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								endpoint: subscription.endpoint,
								payload: {
									title: 'Время вышло!',
									body: 'Пора вспомнить сочетания.',
									icon: '/icon.png'
								},
								scheduledFor: timerEndsAt
							})
						});
					}
				} catch (error) {
					console.error('Failed to schedule web push notification:', error);
					// Fall back to local notification
					// Local notification will be shown when timer expires
				}
			}
			
			// Always set up local notification as fallback (works offline)
			// This will be triggered when timer expires in showLocalNotification()

			intervalWorker.postMessage('start');
		} else if (phase === 'recall') phase = 'result';
	}

	function setAdjective(value: string | Shape) {
		if (category === 'words') {
			currentAdj = value as string;
		} else {
			currentShape = value as Shape;
		}
		nextPhase();
	}

	function setNoun(value: string | Color) {
		if (category === 'words') {
			currentNoun = value as string;
		} else {
			currentColor = value as Color;
		}
		nextPhase();
	}

	let expectedCombos: string[] = $state([]);

	function setExpectedCombos() {
		if (category === 'words') {
			expectedCombos = [
				`${originalAdjective} ${originalNoun}`,
				`${currentAdj} ${originalNoun}`,
				`${currentAdj} ${currentNoun}`
			];
		} else {
			expectedCombos = [
				`${originalShape.name} ${originalColor.name}`,
				`${currentShape.name} ${originalColor.name}`,
				`${currentShape.name} ${currentColor.name}`
			];
		}
	}

	function setRecalledCombos() {
		recalledCombos = [input1.trim(), input2.trim(), input3.trim()];
	}

	async function finishRecall() {
		setRecalledCombos();

		// Clear session from localforage
		try {
			await localforage.removeItem('wordMorphingSession');
			timerEndsAt = null;
		} catch (error) {
			console.error('Error clearing session:', error);
		}

		nextPhase();
	}

	// Функция для проверки совпадения комбинаций
	function isCorrectCombination(recalled: string, expected: string) {
		// замена на случаи зеленый/зелёный
		return (
			recalled.toLocaleLowerCase().replace('ё', 'е') ===
			expected.toLocaleLowerCase().replace('ё', 'е')
		);
	}

	function setOriginalShapeAndColor(shapeName: string, colorName: string) {
		const foundShape = shapes.find((s) => s.name === shapeName);
		const foundColor = colors.find((c) => c.name === colorName);

		if (foundShape) {
			originalShape = foundShape;
		}
		if (foundColor) {
			originalColor = foundColor;
		}
	}

	function setCurrentShapeAndColor(shapeName: string, colorName: string) {
		const foundShape = shapes.find((s) => s.name === shapeName);
		const foundColor = colors.find((c) => c.name === colorName);

		if (foundShape) {
			currentShape = foundShape;
		}
		if (foundColor) {
			currentColor = foundColor;
		}
	}

	async function getSession() {
		try {
			const session: WordMorphingSession | null = await localforage.getItem('wordMorphingSession');
			
			if (session) {
				timerEndsAt = session.timerEndsAt;
				currentTime = Date.now();
				expectedCombos = session.expectedCombos;
				category = session.category;

				if (category === 'shapes') {
					const [origShapeName, origColorName] = expectedCombos[0].split(' ');
					const [currentShapeName, currentColorName] = expectedCombos[2].split(' ');
					setOriginalShapeAndColor(origShapeName, origColorName);
					setCurrentShapeAndColor(currentShapeName, currentColorName);
				}

				// Check if timer has already expired
				if (currentTime >= timerEndsAt) {
					phase = 'recall';
					timerEndsAt = null;
					// Clear expired session
					await localforage.removeItem('wordMorphingSession');
					return;
				}

				phase = 'wait';
				intervalWorker.postMessage('start');
			}
		} catch (error) {
			console.error('Error loading session from localforage:', error);
		}
	}

	onMount(async () => {
		// Проверям подписку на пуш
		subscribed = await isSubscribed();
		showModal = !subscribed;

		getSession();

		// Update currentTime each second for the display
		timeInterval = setInterval(() => {
			if (phase === 'wait' && timerEndsAt) {
				currentTime = Date.now();
				// Check if timer expired
				if (currentTime >= timerEndsAt) {
					phase = 'recall';
					timerEndsAt = null;
					localforage.removeItem('wordMorphingSession').catch(console.error);
					showLocalNotification();
				}
			}
		}, 1000);
	});

	onDestroy(() => {
		intervalWorker.postMessage('stop');
		intervalWorker.terminate();
		if (timeInterval) {
			clearInterval(timeInterval);
		}
	});
</script>

<div>
	{#if showModal}
		<Modal bind:showModal>
			{#snippet header()}
				<h2 class="text-2xl text-white">Подпишитесь на пуш-уведомления</h2>
			{/snippet}
			<div class="flex flex-col gap-4">
				<p class="text-white">
					Для корректной работы некоторых функций требуется подписка на уведомления.
					Например, мы сможем отправлять вам напоминания о прохождении тестов.
				</p>
				<p class="text-white">Для подписки достаточно нажать зелёную кнопочку.</p>
				<p class="text-white">
					Вы всегда сможете подписаться или отписаться от push-уведомлений в любое время
					на странице профиля.
				</p>
				<Button color="green" onclick={subscribe}>Подписаться</Button>
				<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
			</div>
		</Modal>
	{/if}
</div>
<div class="flex flex-col items-center gap-6">
	{#if phase === 'category-select'}
		<h2>Выберите категорию:</h2>
		<div class="grid">
			<Button color="green" onclick={() => selectCategory('words')}>Слова</Button>
			<Button color="blue" onclick={() => selectCategory('shapes')}>Фигуры</Button>
		</div>
	{:else if phase === 'time-select'}
		<h2>Выберите время на запоминание:</h2>
		<div class="time-options grid">
			{#each timeOptions as timeOption}
				<Button
					color={selectedTimeOption === timeOption ? 'blue' : 'gray'}
					onclick={() => selectTime(timeOption)}
				>
					{timeOption.name}
				</Button>
			{/each}
		</div>

		{#if selectedTimeOption.name === 'Кастомный'}
			<div class="custom-time-input">
				<label for="customTime">Введите время в минутах:</label>
				<div class="flex items-center gap-2">
					<TextInput
						plain
						name="customTime"
						bind:value={customTimeInput}
						type="number"
						min="0.5"
						step="0.5"
						onchange={handleCustomTimeChange}
					/>
					<span>мин.</span>
				</div>
				<p class="mt-1 text-sm text-gray-500">
					{customTimeInSeconds} секунд ({formatTime(customTimeInSeconds)})
				</p>
				<Button color="green" onclick={confirmCustomTime}>Подтвердить</Button>
			</div>
		{/if}
	{:else if phase === 'initial'}
		<h2>Сочетание для запоминания:</h2>
		{#if category === 'words'}
			<p class="text-3xl">{originalAdjective} {originalNoun}</p>
		{:else}
			<div class="flex flex-col items-center">
				<svg class="shape-svg" viewBox="0 0 100 100" width="120" height="120">
					{@html originalShape.render(originalColor.value)}
				</svg>
				<p class="mt-2 text-xl">{originalShape.name} {originalColor.name}</p>
			</div>
		{/if}
		<Button color="green" onclick={nextPhase}>Далее</Button>
	{:else if phase === 'replace-adj'}
		{#if category === 'words'}
			<h2>Выберите новое прилагательное:</h2>
			<div class="grid">
				{#each adjectiveChoices as adj}
					<Button color="green" onclick={() => setAdjective(adj)}>{adj}</Button>
				{/each}
			</div>
		{:else}
			<h2>Выберите новую фигуру:</h2>
			<div class="shapes-grid grid">
				{#each shapeChoices as shape}
					<button class="shape-button" onclick={() => setAdjective(shape)}>
						<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
							{@html shape.render(originalColor.value)}
						</svg>
						<span>{shape.name}</span>
					</button>
				{/each}
			</div>
		{/if}
	{:else if phase === 'replace-noun'}
		{#if category === 'words'}
			<h2>Выберите новое существительное:</h2>
			<div class="grid">
				{#each nounChoices as noun}
					<Button color="green" onclick={() => setNoun(noun)}>{noun}</Button>
				{/each}
			</div>
		{:else}
			<h2>Выберите новый цвет:</h2>
			<div class="colors-grid grid">
				{#each colorChoices as color}
					<button class="color-button" onclick={() => setNoun(color)}>
						<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
							{@html currentShape.render(color.value)}
						</svg>
						<span>{color.name}</span>
					</button>
				{/each}
			</div>
		{/if}
	{:else if phase === 'wait'}
		<div class="flex flex-col items-center gap-4">
			<h2>Время запоминания:</h2>
			<div class="grid justify-items-center items-center">
				<span class="text-3xl col-start-1 row-start-1"
					>{timerEndsAt ? formatTime(Math.max(0, Math.floor((timerEndsAt - currentTime) / 1000))) : formatTime(0)}</span
				>
			</div>
		</div>
	{:else if phase === 'recall'}
		<h2>Вспомните все три сочетания:</h2>
		<div class="flex w-9/12 flex-col gap-2">
			{#if category === 'words'}
				<TextInput plain name="input1" bind:value={input1} placeholder="1. Исходное"
				></TextInput>
				<TextInput
					plain
					name="input2"
					bind:value={input2}
					placeholder="2. С заменой прилагательного"
				></TextInput>
				<TextInput
					plain
					name="input3"
					bind:value={input3}
					placeholder="3. С заменой прил. и сущ."
				></TextInput>
			{:else}
				<TextInput
					plain
					name="input1"
					bind:value={input1}
					placeholder="1. Исходная фигура и цвет"
				></TextInput>
				<TextInput plain name="input2" bind:value={input2} placeholder="2. С заменой фигуры"
				></TextInput>
				<TextInput
					plain
					name="input3"
					bind:value={input3}
					placeholder="3. С заменой фигуры и цвета"
				></TextInput>
			{/if}
		</div>
		<Button color="blue" onclick={finishRecall}>Показать результат</Button>
	{:else if phase === 'result'}
		<div class="flex flex-col gap-2">
			<h2>Ваши ответы:</h2>
			<ol>
				{#each recalledCombos as recalled, i}
					<li
						class="text-center"
						style="color: {isCorrectCombination(recalled, expectedCombos[i])
							? 'var(--color-green-500)'
							: 'var(--color-red-400)'}"
					>
						{recalled || '(не введено)'}
					</li>
				{/each}
			</ol>
		</div>

		<div class="flex flex-col gap-2">
			<h2>Ожидаемые ответы:</h2>
			{#if category === 'words'}
				<ul>
					{#each expectedCombos as expected}
						<li class="text-center">{expected}</li>
					{/each}
				</ul>
			{:else}
				<div class="expected-shapes">
					<div class="shape-item">
						<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
							{@html originalShape.render(originalColor.value)}
						</svg>
						<span>{originalShape.name} {originalColor.name}</span>
					</div>
					<div class="shape-item">
						<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
							{@html currentShape.render(originalColor.value)}
						</svg>
						<span>{currentShape.name} {originalColor.name}</span>
					</div>
					<div class="shape-item">
						<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
							{@html currentShape.render(currentColor.value)}
						</svg>
						<span>{currentShape.name} {currentColor.name}</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	.time-options {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		max-width: 500px;
	}

	.custom-time-input {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background-color: #f9f9f9;
	}

	.shapes-grid,
	.colors-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.shape-button,
	.color-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.shape-button:hover,
	.color-button:hover {
		transform: scale(1.05);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.shape-button span,
	.color-button span {
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}

	.expected-shapes {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.shape-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.shape-svg {
		transition: transform 0.2s;
	}

	.shape-svg:hover {
		transform: scale(1.05);
	}

</style>
