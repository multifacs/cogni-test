<!-- RhythmGame.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';

	// Размеры canvas
	let canvasWidth = $state(100);
	let canvasHeight = $state(100);
	let canvas = $state(Object());
	let ctx = $state(Object());

	// Данные для отрисовки
	let tracks = 9;
	let trackHeight = 50;
	let trackSpacing = 10;
	let totalSteps = 16;

	// Отступы для canvas
	const padding = 16;

	// Мелодия
	let melody = $state([]);

	// Состояние игры
	let isPlaying = $state(false);
	let currentTrack = $state(0); // 0 - образец, 1-8 - попытки
	let currentStep = $state(-1); // Начинаем с -3 для отсчета трех нот
	let repetitionCount = $state(0); // Счетчик повторений образца

	// Состояние инициализации
	let gameInitialized = $state(false);

	// Аудио контекст
	let audioContext = $state(Object());

	// Анимация
	let animationFrame = $state(Object());
	let lastTimestamp = $state(0);
	let bpm = 60; // Темп (ударов в минуту)
	let stepDuration = $state(Object()); // Длительность шага в мс

	// Записи пользовательских попыток
	let userAttempts = $state(
		Array(8)
			.fill()
			.map(() => [])
	);

	let resizeTimer = $state(Object());

	onMount(() => {
		// Генерация мелодии при загрузке
		generateMelody();

		// Инициализация canvas для отображения стартового экрана
		initCanvas();

		// Отрисовка стартового экрана
		drawStartScreen();

		// Добавляем обработчик нажатия
		if (canvas) {
			canvas.addEventListener('click', handleCanvasClick);
		}

		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		window.removeEventListener('resize', handleResize);
		if (canvas) {
			canvas.removeEventListener('click', handleCanvasClick);
		}
		if (resizeTimer) clearTimeout(resizeTimer);
		if (animationFrame) cancelAnimationFrame(animationFrame);
	});

	// Функция для генерации мелодии
	function generateMelody() {
		melody = [];

		// Определяем общее количество нот (4-6)
		const totalNotes = 4 + Math.floor(Math.random() * 3); // 4, 5 или 6

		// Распределяем количество для каждого типа нот
		let tonCount = 1;
		let pultonCount = 1;
		let ctvrtCount = 1;

		// Распределяем оставшиеся ноты случайным образом
		let remaining = totalNotes - (tonCount + pultonCount + ctvrtCount);
		while (remaining > 0) {
			const type = Math.floor(Math.random() * 3); // 0, 1, или 2
			if (type === 0) tonCount++;
			else if (type === 1) pultonCount++;
			else ctvrtCount++;
			remaining--;
		}

		// Доступные позиции для каждого типа нот
		const tonPositions = [0, 4, 8, 12];
		const pultonPositions = [2, 6, 10, 14];
		const ctvrtPositions = [1, 3, 5, 7, 9, 11, 13, 15];

		// Функция для случайного выбора позиций
		function getRandomPositions(positions, count) {
			const shuffled = [...positions].sort(() => Math.random() - 0.5);
			return shuffled.slice(0, count);
		}

		// Добавляем тоны
		getRandomPositions(tonPositions, tonCount).forEach((step) => {
			melody.push({ step, type: 'ton' });
		});

		// Добавляем полутоны
		getRandomPositions(pultonPositions, pultonCount).forEach((step) => {
			melody.push({ step, type: 'pulton' });
		});

		// Добавляем четверти тонов
		getRandomPositions(ctvrtPositions, ctvrtCount).forEach((step) => {
			melody.push({ step, type: 'ctvrton' });
		});

		// Сортируем мелодию по шагам
		melody.sort((a, b) => a.step - b.step);

		console.log('Сгенерирована мелодия:', melody);
	}

	function initCanvas() {
		if (!canvas) return;

		ctx = canvas.getContext('2d');
		updateCanvasSize();
	}

	function updateCanvasSize() {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const isPortrait = viewportHeight > viewportWidth;

		if (isPortrait) {
			canvasWidth = viewportWidth - padding * 2;
			canvasHeight = trackHeight * tracks + trackSpacing * (tracks - 1);
		} else {
			canvasHeight = viewportHeight * 0.8 - padding * 2;
			canvasWidth = Math.min(viewportWidth - padding * 2, canvasHeight * 0.8);

			trackHeight = Math.floor((canvasHeight - trackSpacing * (tracks - 1)) / tracks);
		}

		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
	}

	function handleResize() {
		if (resizeTimer) clearTimeout(resizeTimer);

		resizeTimer = setTimeout(() => {
			if (canvas && ctx) {
				updateCanvasSize();
				if (gameInitialized) {
					requestAnimationFrame(drawTracks);
				} else {
					drawStartScreen();
				}
			}
		}, 100);
	}

	// Отрисовка стартового экрана
	function drawStartScreen() {
		if (!ctx || !canvas) return;

		// Очистка canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Фон
		ctx.fillStyle = '#f0f0f0';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Рамка
		ctx.strokeStyle = '#cccccc';
		ctx.lineWidth = 2;
		ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

		// Надпись
		ctx.fillStyle = '#333333';
		ctx.font = 'bold 24px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('Нажмите чтобы начать', canvas.width / 2, canvas.height / 2);

		// Подсказка
		ctx.font = '16px Arial';
		ctx.fillText('Повторяйте ритм, нажимая на дорожку', canvas.width / 2, canvas.height / 2 + 40);
	}

	// Обработчик нажатия на canvas
	function handleCanvasClick(event) {
		if (!gameInitialized) {
			// Первое нажатие - инициализация игры
			initializeGame();
			return;
		}

		// Последующие нажатия - обработка игровых нажатий
		handleUserClick(event);
	}

	// Инициализация игры после первого нажатия
	function initializeGame() {
		console.log('Инициализация игры...');
		gameInitialized = true;

		// Инициализация audio context (теперь это разрешено)
		try {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			console.log('Аудио контекст создан');
		} catch (e) {
			console.error('Web Audio API не поддерживается браузером:', e);
		}

		// Расчет длительности шага на основе BPM
		stepDuration = 60000 / bpm / 4; // мс на четверть тона

		// Запускаем игру
		startGame();
	}

	// Получить цвет ноты по ее типу
	function getNoteColor(type) {
		switch (type) {
			case 'ton':
				return '#3366cc'; // Синий для тона
			case 'pulton':
				return '#8833cc'; // Фиолетовый для полутона
			case 'ctvrton':
				return '#cc3366'; // Красноватый для четверти тона
			default:
				return '#333333';
		}
	}

	// Отрисовка всех дорожек и анимационного шарика
	function drawTracks(timestamp) {
		if (!ctx || !canvas) {
			console.error('Canvas контекст не доступен');
			return;
		}

		// Очистка canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Отрисовка фона
		ctx.fillStyle = '#f0f0f0';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Отрисовка каждой дорожки
		for (let i = 0; i < tracks; i++) {
			const y = i * (trackHeight + trackSpacing);

			// Фон дорожки
			ctx.fillStyle = i === 0 ? '#e0f0ff' : '#ffffff';
			ctx.fillRect(0, y, canvas.width, trackHeight);

			// Рамка дорожки
			ctx.strokeStyle = '#cccccc';
			ctx.lineWidth = 1;
			ctx.strokeRect(0, y, canvas.width, trackHeight);

			// Разметка дорожки (16 частей)
			for (let j = 0; j <= totalSteps; j++) {
				const x = (canvas.width / totalSteps) * j;

				// Линии разметки разной толщины в зависимости от типа деления
				if (j % 4 === 0) {
					// Тон (целая нота)
					ctx.strokeStyle = '#666666';
					ctx.lineWidth = 2;
				} else if (j % 2 === 0) {
					// Полутон
					ctx.strokeStyle = '#999999';
					ctx.lineWidth = 1;
				} else {
					// Четверть тона
					ctx.strokeStyle = '#dddddd';
					ctx.lineWidth = 0.5;
				}

				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x, y + trackHeight);
				ctx.stroke();
			}

			// Отрисовка нот мелодии только на первой дорожке
			if (i === 0) {
				melody.forEach((note) => {
					const x = (canvas.width / totalSteps) * note.step + canvas.width / totalSteps / 2;
					const centerY = y + trackHeight / 2;

					// Рисуем шарик
					ctx.fillStyle = getNoteColor(note.type);
					ctx.beginPath();
					ctx.arc(x, centerY, trackHeight / 5, 0, Math.PI * 2);
					ctx.fill();

					// Добавляем небольшую тень для объемности
					ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
					ctx.shadowBlur = 3;
					ctx.shadowOffsetX = 1;
					ctx.shadowOffsetY = 1;

					// Рисуем блик для объемности
					ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
					ctx.beginPath();
					ctx.arc(
						x - trackHeight / 15,
						centerY - trackHeight / 15,
						trackHeight / 12,
						0,
						Math.PI * 2
					);
					ctx.fill();

					// Сбрасываем тени для остальных элементов
					ctx.shadowColor = 'transparent';
					ctx.shadowBlur = 0;
					ctx.shadowOffsetX = 0;
					ctx.shadowOffsetY = 0;
				});
			}

			// Отрисовка пользовательских нажатий
			if (i > 0 && userAttempts[i - 1] && userAttempts[i - 1].length > 0) {
				userAttempts[i - 1].forEach((tap) => {
					const x = (canvas.width / totalSteps) * tap.step + canvas.width / totalSteps / 2;
					const centerY = y + trackHeight / 2;

					// Цвет в зависимости от точности
					const color =
						tap.accuracy < 0.05
							? '#33cc66' // Очень точно
							: tap.accuracy < 0.1
								? '#99cc33' // Хорошо
								: tap.accuracy < 0.2
									? '#cccc33' // Нормально
									: '#cc6633'; // Неточно

					// Рисуем шарик пользователя
					ctx.fillStyle = color;
					ctx.beginPath();
					ctx.arc(x, centerY, trackHeight / 6, 0, Math.PI * 2);
					ctx.fill();
				});
			}
		}

		// Отрисовка анимационного шарика, если игра активна
		if (isPlaying && currentStep >= 0) {
			// Расчет текущей позиции шарика
			let stepPosition = currentStep;
			if (timestamp && lastTimestamp) {
				const deltaTime = timestamp - lastTimestamp;
				const progress = deltaTime / stepDuration;
				stepPosition += progress;
			}

			// Определяем, на какой дорожке должен быть шарик
			const trackY = currentTrack * (trackHeight + trackSpacing) + trackHeight / 2;

			// Рассчитываем X-позицию
			let x;
			if (stepPosition < 0) {
				// Для отсчета перед началом (3 ноты)
				x = canvasWidth / 2; // Центр экрана
			} else {
				// Для движения по дорожке
				x = (canvasWidth / totalSteps) * stepPosition;
			}

			// Рисуем шарик
			ctx.fillStyle = '#ff3333';
			ctx.beginPath();
			ctx.arc(x, trackY, trackHeight / 4, 0, Math.PI * 2);
			ctx.fill();

			// Добавляем тень
			ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
			ctx.shadowBlur = 5;
			ctx.shadowOffsetX = 2;
			ctx.shadowOffsetY = 2;

			// Добавляем блик
			ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
			ctx.beginPath();
			ctx.arc(x - trackHeight / 12, trackY - trackHeight / 12, trackHeight / 8, 0, Math.PI * 2);
			ctx.fill();

			// Сбрасываем тени
			ctx.shadowColor = 'transparent';
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
		}
	}

	// Запуск игры
	function startGame() {
		if (isPlaying) return;

		isPlaying = true;
		currentTrack = 0; // Начинаем с образца
		currentStep = -1; // Начинаем с отсчета трех нот
		repetitionCount = 0; // Сбрасываем счетчик повторений

		// Очищаем предыдущие попытки
		userAttempts = Array(8)
			.fill()
			.map(() => []);

		// Запускаем анимацию
		lastTimestamp = performance.now();
		animationFrame = requestAnimationFrame(gameLoop);
	}

	// Основной игровой цикл
	function gameLoop(timestamp) {
		const deltaTime = timestamp - lastTimestamp;

		// Обновляем позицию шарика
		if (deltaTime >= stepDuration) {
			lastTimestamp = timestamp;
			currentStep += 1;

			// Проверяем, нужно ли воспроизводить звук

			// 1. Отсчет перед началом движения (3 ноты)
			// if (currentStep < 0) {
			// 	// Для каждого шага отсчета свой звук
			// 	playCountdownSound(currentStep);
			// }
			// 2. Метроном на полунотах (только не на первой дорожке)
			if (currentStep % 4 === 0 && currentTrack > 0 && currentTrack < 3) {
				playMetronomeSound(0.2); // Тихий звук метронома
			}

			// 3. Звук ноты мелодии (только на первой дорожке-образце)
			if (currentStep >= 0) {
				const noteAtStep = melody.find((note) => note.step === currentStep);
				
				if (noteAtStep && currentTrack === 0) {
					playNoteSound(noteAtStep.type, 0.5); // Громкий звук ноты
				}
			}

			// Проверяем завершение дорожки
			if (currentStep >= totalSteps) {
				currentStep = 0; // Сброс на отсчет перед следующей дорожкой

				// Логика повторения и перехода
				if (currentTrack === 0) {
					repetitionCount += 1;

					// После двух повторений образца переходим к попыткам пользователя
					if (repetitionCount >= 2) {
						currentTrack = 1;
						repetitionCount = 0;
					}
				} else {
					// Переход к следующей попытке пользователя
					currentTrack += 1;

					// Если все попытки завершены
					if (currentTrack >= tracks) {
						isPlaying = false;
						cancelAnimationFrame(animationFrame);
						drawTracks(); // Финальная отрисовка
						return;
					}
				}
			}
		}

		// Отрисовка
		drawTracks(timestamp);

		// Продолжаем анимацию, если игра активна
		if (isPlaying) {
			animationFrame = requestAnimationFrame(gameLoop);
		}
	}

	// Воспроизведение звука отсчета
	function playCountdownSound(step) {
		if (!audioContext) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.type = 'sine';

		// Разные частоты для шагов отсчета, чтобы звучали как полутоны
		switch (step) {
			case -3:
				oscillator.frequency.value = 659.25; // E5
				break;
			case -2:
				oscillator.frequency.value = 587.33; // D5
				break;
			case -1:
				oscillator.frequency.value = 523.25; // C5
				break;
			default:
				oscillator.frequency.value = 587.33;
		}

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		// Параметры звука
		gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.15);
	}

	// Воспроизведение звука метронома
	function playMetronomeSound(volume = 0.2) {
		if (!audioContext) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.type = 'triangle';
		oscillator.frequency.value = 880; // A5

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.1);
	}

	// Воспроизведение звука ноты
	function playNoteSound(type, volume = 0.5) {
		if (!audioContext) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		// Разные типы и частоты для разных типов нот
		switch (type) {
			case 'ton':
				oscillator.type = 'sine';
				oscillator.frequency.value = 880; // A5
				break;
			case 'pulton':
				oscillator.type = 'sine';
				oscillator.frequency.value = 784; // G5
				break;
			case 'ctvrton':
				oscillator.type = 'sine';
				oscillator.frequency.value = 698; // F5
				break;
			default:
				oscillator.frequency.value = 880;
		}

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.2);
	}

	// Обработка нажатий пользователя
	function handleUserClick(event) {
		if (!isPlaying || currentTrack === 0 || currentStep < 0) return;

		// Используем текущую позицию движущегося шарика вместо координаты нажатия
		const currentPosition = currentStep;

		// Вычисляем точность (относительно ближайшей ноты мелодии)
		let minDistance = Infinity;
		let closestNote = null;

		for (const note of melody) {
			const distance = Math.abs(currentPosition - note.step);
			if (distance < minDistance) {
				minDistance = distance;
				closestNote = note;
			}
		}

		// Нормализуем точность от 0 до 1 (0 - идеально, 1 - максимальное отклонение)
		const accuracy = Math.min(minDistance / 2, 1);

		// Записываем нажатие пользователя
		userAttempts[currentTrack - 1].push({
			step: currentPosition,
			time: Date.now(),
			accuracy: accuracy
		});

		// Воспроизводим звук ноты
		playNoteSound(closestNote?.type || 'ton', 0.5);

		// Перерисовка
		drawTracks();
	}
</script>

<div class="rhythm-game">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.rhythm-game {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		padding: 16px;
		box-sizing: border-box;
	}

	canvas {
		border: 1px solid #ccc;
		background-color: #f9f9f9;
		display: block;
	}
</style>
