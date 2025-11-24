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
			// Интерполяция позиции для плавного движения
			const INTERPOLATE = false; // Включить/выключить интерполяцию
			if (INTERPOLATE && timestamp && lastTimestamp) {
				const deltaTime = timestamp - lastTimestamp;
				const progress = Math.min(deltaTime / stepDuration, 1); // Ограничиваем от 0 до 1
				const easedProgress = easeInOutCubic(progress);
				stepPosition += easedProgress;
			}

			// Определяем, на какой дорожке должен быть шарик
			const trackY = currentTrack * (trackHeight + trackSpacing) + trackHeight / 2;

			// Рассчитываем X-позицию
			let x;
			if (stepPosition < 0) {
				// Для отсчета перед началом (3 ноты)
				x = 0; // Центр экрана
			} else {
				// Для движения по дорожке
				x = (canvasWidth / totalSteps) * (stepPosition + 0.5);
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