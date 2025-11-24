<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import IntervalWorker from '$lib/workers/interval_worker.ts?worker';
	import { shuffle } from '$lib/utils';
	import { isSubscribed } from '$lib/utils/push';
	import { pushService } from '$lib/pushService';
	import { adjectives, nouns } from './logic/data';
	import localforage from 'localforage';
	import type { Color, Shape, WordMorphingSession } from './types';

	import { v7 as uuid } from 'uuid';
	import Result from './components/Result.svelte';
	import Recall from './components/Recall.svelte';
	import WaitTimer from './components/WaitTimer.svelte';
	import ReplaceNoun from './components/ReplaceNoun.svelte';
	import ReplaceAdj from './components/ReplaceAdj.svelte';
	import CategorySelect from './components/CategorySelect.svelte';
	import TimeSelect from './components/TimeSelect.svelte';
	import Initial from './components/Initial.svelte';
	import { is } from 'drizzle-orm';

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
		{ name: 'Пользовательский', seconds: 0 } // Особый случай
	];

	let subscribed = $state(false);
	let showModal = $state(false);

	// Веб воркер для отслеживания интервала
	// Нужно, для корректной работы таймера, когда страница не в фокусе
	let intervalWorker = new IntervalWorker();
	intervalWorker.onmessage = (e) => {
		console.log('Interval worker message:', e.data);
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

	// let { data } = $props();

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

	const isOnline = $state(navigator.onLine);

	// Функция для обработки изменения кастомного времени
	function handleCustomTimeChange() {
		const minutes = parseFloat(customTimeInput);
		if (!isNaN(minutes) && minutes > 0) {
			customTimeInSeconds = Math.round(minutes * 60);
		}
	}

	// Функция для отправки локального уведомления
	async function showLocalNotification() {
		if ('Notification' in window && !isOnline) {
			// Запрашиваем разрешение, если еще не получено
			if (Notification.permission === 'default') {
				await Notification.requestPermission();
			}

			// Показываем уведомление, если разрешено
			if (Notification.permission === 'granted') {
				new Notification('Время вышло!', {
					body: 'Пора вспомнить сочетания.',
					icon: '/icon.png',
					tag: `word-morphing-timer-${uuid()}` // Тег для замены предыдущих уведомлений
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

	async function selectTime(timeOption: TimeOption) {
		selectedTimeOption = timeOption;
		if (timeOption.name !== 'Пользовательский') {
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
				selectedTimeOption.name === 'Пользовательский'
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
									id: `word-morphing-${uuid()}`,
									title: 'Время вышло!',
									body: 'Пора вспомнить сочетания.'
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
			const session: WordMorphingSession | null =
				await localforage.getItem('wordMorphingSession');

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
	});

	onDestroy(() => {
		intervalWorker.postMessage('stop');
		intervalWorker.terminate();
	});
</script>

{#if showModal}
	<Modal bind:showModal>
		{#snippet header()}
			<h2 class="text-2xl text-white">Подпишитесь на пуш-уведомления</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				Для корректной работы некоторых функций требуется подписка на уведомления. Например,
				мы сможем отправлять вам напоминания о прохождении тестов.
			</p>
			<p class="text-white">Для подписки достаточно нажать зелёную кнопочку.</p>
			<p class="text-white">
				Вы всегда сможете подписаться или отписаться от push-уведомлений в любое время на
				странице профиля.
			</p>
			<Button color="green" onclick={subscribe}>Подписаться</Button>
			<Button color="red" onclick={() => (showModal = false)}>Нет, спасибо</Button>
		</div>
	</Modal>
{/if}

<div class="flex flex-col items-center gap-6">
	{#if phase === 'category-select'}
		<CategorySelect {selectCategory} />
	{:else if phase === 'time-select'}
		<TimeSelect
			{timeOptions}
			{selectedTimeOption}
			{selectTime}
			bind:customTimeInput
			{handleCustomTimeChange}
			{customTimeInSeconds}
			{confirmCustomTime}
		/>
	{:else if phase === 'initial'}
		<Initial
			{category}
			{originalAdjective}
			{originalNoun}
			{originalShape}
			{originalColor}
			{nextPhase}
		/>
	{:else if phase === 'replace-adj'}
		<ReplaceAdj {category} {adjectiveChoices} {shapeChoices} {originalColor} {setAdjective} />
	{:else if phase === 'replace-noun'}
		<ReplaceNoun {category} {nounChoices} {colorChoices} {currentShape} {setNoun} />
	{:else if phase === 'wait'}
		<WaitTimer {timerEndsAt} {currentTime} />
	{:else if phase === 'recall'}
		<Recall {category} bind:input1 bind:input2 bind:input3 onFinishRecall={finishRecall} />
	{:else if phase === 'result'}
		<Result
			{recalledCombos}
			{expectedCombos}
			{category}
			{originalShape}
			{originalColor}
			{currentShape}
			{currentColor}
		></Result>
	{/if}
</div>
