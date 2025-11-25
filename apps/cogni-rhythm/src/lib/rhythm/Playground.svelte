<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RhythmResult } from './types';
	import localforage from 'localforage';

	// props
	export let gameEnd: () => void;
	export let sendResults: (results: RhythmResult[]) => void;

	export let difficulty: 'easy' | 'medium' | 'hard' = 'easy';

	// ===== Типы =====
	type NoteType = 'ton' | 'pulton' | 'ctvrton';
	type Note = { step: number; type: NoteType };

	type UserTap = {
		timeRel: number; // время от начала игры, мс (непрерывное)
	};

	// ===== Canvas =====
	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let canvasWidth = 100;
	let canvasHeight = 100;

	// ===== Конфиг ритма =====
	const stepsPerInterval = 16;

	// 2 эталонных (без ввода), 2 с призраками и вводом, 4 без призраков
	const sampleRepeats = 2;
	const tapRepeatsWithGhosts = 2;
	const tapRepeatsNoGhosts = 4;
	const totalIntervals = sampleRepeats + tapRepeatsWithGhosts + tapRepeatsNoGhosts; // 8

	let melody: Note[] = [];
	let bpm = 75;
	let stepDuration = 0; // мс на один дискретный шаг
	let intervalDuration = 0; // мс на один интервал (паттерн)

	// ===== Состояния игры =====
	let gameInitialized = false;
	let isPlaying = false;

	let startTimeMs: number | null = null; // timestamp rAF старта
	let animationFrame: number | null = null;

	// абсолютные времена ЭТАЛОННЫХ нот (без первых двух проходов)
	let noteTimesteps: number[] = [];

	// нажатия пользователя (время от начала игры, мс)
	let userAttempts: UserTap[] = [];

	let audioContext: AudioContext | null = null;
	const triggeredNotes = new Set<string>();

	// ===== Генерация мелодии =====
	function generateMelody() {
		melody = [];

		// function makeEasy() {
		// 	// три основных тона в центре
		// 	melody.push({ step: 4, type: 'ton' });
		// 	melody.push({ step: 8, type: 'ton' });
		// 	melody.push({ step: 12, type: 'ton' });
		// }

		// function makeMedium() {
		// 	// три основных тона в центре
		// 	melody.push({ step: 8, type: 'ton' });
		// 	melody.push({ step: 12, type: 'ton' });
		// }

		// function makeHard() {
		// 	// три основных тона в центре
		// 	melody.push({ step: 4, type: 'ton' });
		// 	melody.push({ step: 6, type: 'ton' });
		// 	melody.push({ step: 12, type: 'ton' });
		// }

		function makeEasy() {
			melody.push({ step: 4, type: 'ton' });
			melody.push({ step: 8, type: 'ton' });
			melody.push({ step: 12, type: 'ton' });
		}

		function makeMedium() {
			melody.push({ step: 2, type: 'pulton' });
			melody.push({ step: 4, type: 'ton' });
			melody.push({ step: 8, type: 'ton' });
			melody.push({ step: 10, type: 'pulton' });
			melody.push({ step: 14, type: 'pulton' });
		}

		function makeHard() {
			melody.push({ step: 4, type: 'ton' });
			melody.push({ step: 6, type: 'pulton' });
			melody.push({ step: 8, type: 'ton' });
			melody.push({ step: 14, type: 'pulton' });
		}

		switch (difficulty) {
			case 'easy':
				makeEasy();
				break;
			case 'medium':
				makeMedium();
				break;
			case 'hard':
				makeHard();
				break;
		}

		melody.sort((a, b) => a.step - b.step);
		console.log('Сгенерированная мелодия:', melody);
	}

	// ===== Canvas init / resize =====
	function initCanvas() {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		updateCanvasSize();
	}

	function updateCanvasSize() {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		canvasWidth = rect.width;
		canvasHeight = rect.height;
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		if (!isPlaying) {
			drawIdle();
		}
	}

	function handleResize() {
		updateCanvasSize();
	}

	// ===== Аудио =====
	function initAudio() {
		if (audioContext) return;

		try {
			audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		} catch (e) {
			console.error('Web Audio API не поддерживается', e);
			audioContext = null;
		}
	}

	function playMetronomeSound(volume = 0.2) {
		if (!audioContext) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.type = 'triangle';
		oscillator.frequency.value = 880;

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.1);
	}

	function playNoteSound(type: NoteType, volume = 0.5) {
		if (!audioContext) return;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		switch (type) {
			case 'ton':
				oscillator.type = 'sine';
				oscillator.frequency.value = 880;
				break;
			case 'pulton':
				oscillator.type = 'sine';
				oscillator.frequency.value = 784;
				break;
			case 'ctvrton':
				oscillator.type = 'sine';
				oscillator.frequency.value = 698;
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

	// ===== Стартовый экран =====
	function drawIdle() {
		if (!ctx || !canvas) return;
		const width = canvas.width;
		const height = canvas.height;

		ctx.clearRect(0, 0, width, height);

		const gradient = ctx.createRadialGradient(
			width / 2,
			height * 0.3,
			width * 0.1,
			width / 2,
			height / 2,
			width * 0.7
		);
		gradient.addColorStop(0, '#0f172a');
		gradient.addColorStop(1, '#020617');

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// ctx.fillStyle = '#e5e7eb';
		// ctx.font = '600 24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
		// ctx.textAlign = 'center';
		// ctx.fillText('Ритмический тест', width / 2, height / 2 - 10);
		// ctx.font = '400 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
		// ctx.fillStyle = '#9ca3af';
		// ctx.fillText('Нажмите, чтобы начать', width / 2, height / 2 + 18);
	}

	// ===== Инициализация игры =====
	function initializeGame() {
		if (gameInitialized) return;

		gameInitialized = true;
		initAudio();

		// один дискретный шаг = четверть в темпе bpm
		stepDuration = 60000 / bpm / 4; // мс
		intervalDuration = stepsPerInterval * stepDuration;

		userAttempts = [];
		noteTimesteps = [];
		triggeredNotes.clear();
		startGame();
	}

	function startGame() {
		isPlaying = true;
		startTimeMs = null;
		if (animationFrame !== null) cancelAnimationFrame(animationFrame);
		animationFrame = requestAnimationFrame(gameLoop);
	}

	// ===== Основной цикл =====
	function gameLoop(timestamp: number) {
		if (!ctx || !canvas || !isPlaying) return;

		if (startTimeMs === null) startTimeMs = timestamp;
		const elapsed = timestamp - startTimeMs; // мс с начала игры

		const currentIntervalIndex = Math.floor(elapsed / intervalDuration);
		if (currentIntervalIndex >= totalIntervals) {
			finishGame();
			return;
		}

		triggerNotes(elapsed);
		drawScene(elapsed);

		if (isPlaying) {
			animationFrame = requestAnimationFrame(gameLoop);
		}
	}

	// ===== Звуки эталона + фиксация таймингов эталонных нот =====
	function triggerNotes(elapsedRel: number) {
		if (startTimeMs === null) return;

		for (let interval = 0; interval < totalIntervals; interval++) {
			const baseTime = interval * intervalDuration;

			for (let i = 0; i < melody.length; i++) {
				const note = melody[i];
				const noteTimeRel = baseTime + note.step * stepDuration;
				const key = `${interval}-${i}`;
				if (triggeredNotes.has(key)) continue;

				if (elapsedRel >= noteTimeRel) {
					triggeredNotes.add(key);

					const isSampleInterval = interval < sampleRepeats;
					const hasGhostsInterval = interval < sampleRepeats + tapRepeatsWithGhosts;

					// Эталонный звук в первых 4 проходах
					if (isSampleInterval || hasGhostsInterval) {
						playNoteSound(note.type, isSampleInterval ? 0.6 : 0.4);
					}

					// Для расчёта отклонений нам нужны ВСЕ эталонные ноты, кроме первых 2 проходов
					if (!isSampleInterval) {
						const noteTimeAbs = startTimeMs + noteTimeRel;
						noteTimesteps = [...noteTimesteps, noteTimeAbs];
					}
				}
			}
		}
	}

	// ===== Нажатия пользователя =====
	function registerTap() {
		if (!isPlaying || startTimeMs === null || intervalDuration <= 0) return;

		const now = performance.now();
		const timeRel = now - startTimeMs;
		const intervalIndex = Math.floor(timeRel / intervalDuration);

		// Первые два прохода: эталон, игнорируем нажатия вообще
		if (intervalIndex < sampleRepeats) {
			return;
		}

		// Остальные 6 проходов: принимаем нажатия
		userAttempts = [...userAttempts, { timeRel }];

		// Звук от нажатий
		playMetronomeSound(0.35);
	}

	function handleCanvasClick() {
		if (!gameInitialized) {
			initializeGame();
		} else {
			registerTap();
		}
	}

	function handleTapButton() {
		if (!gameInitialized) {
			initializeGame();
		} else {
			registerTap();
		}
	}

	// ===== Завершение и расчёт результатов =====
	async function finishGame() {
		isPlaying = false;
		if (animationFrame !== null) {
			cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}

		if (ctx && canvas && startTimeMs !== null) {
			const elapsed = performance.now() - startTimeMs;
			drawScene(elapsed);
		}

		if (startTimeMs === null) return;

		// абсолютные времена нажатий
		const tapsAbs = userAttempts.map((t) => startTimeMs! + t.timeRel);

		// сортировка на всякий случай
		const notes = [...noteTimesteps].sort((a, b) => a - b);
		const taps = [...tapsAbs].sort((a, b) => a - b);

		const expectedCount = notes.length;
		const actualCount = taps.length;
		const overpress = actualCount - expectedCount; // >0 — пережатий больше, <0 — недожатий

		console.log('Rhythm debug:', {
			expectedCount,
			actualCount,
			overpress
		});

		// сопоставляем КАЖДОЕ нажатие с ближайшим эталоном
		const results: RhythmResult[] = [];
		if (notes.length > 0) {
			let i = 0; // индекс по нотам
			for (const tapTime of taps) {
				// сдвигаем i к ближайшей ноте
				while (
					i + 1 < notes.length &&
					Math.abs(notes[i + 1] - tapTime) <= Math.abs(notes[i] - tapTime)
				) {
					i++;
				}
				results.push({
					attempt: tapTime,
					note: notes[i]
				});
			}
		}

		// запишем overpress в первый элемент (если есть)
		if (results.length > 0) {
			results[0].overpress = overpress;
		}

		console.log('Rhythm results (per tap):', results);

		await localforage.setItem(`results-${difficulty}-uploaded`, false);
		// console.log("set", difficulty, "false")

		gameEnd();
		sendResults(results);
	}

	// ===== Отрисовка =====
	function drawScene(elapsedRel: number) {
		if (!ctx || !canvas) return;

		const width = canvas.width;
		const height = canvas.height;

		ctx.clearRect(0, 0, width, height);

		// фон
		const bg = ctx.createLinearGradient(0, 0, 0, height);
		bg.addColorStop(0, '#020617');
		bg.addColorStop(1, '#000000');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, width, height);

		const paddingX = 40;
		const laneWidth = width - paddingX * 2;
		const laneHeight = Math.min(80, height * 0.35);
		const laneY = height / 2 - laneHeight / 2;
		const laneCenterY = laneY + laneHeight / 2;
		const centerX = width / 2;

		const currentInterval = Math.floor(elapsedRel / intervalDuration);

		// цвет дорожки по фазам
		let laneColorStart = '#0b1120';
		let laneColorEnd = '#020617';

		if (currentInterval < sampleRepeats) {
			// зелёная: чистый эталон
			laneColorStart = '#02a651';
			laneColorEnd = '#015c2d';
		} else if (currentInterval < sampleRepeats + tapRepeatsWithGhosts) {
			// светло-зелёная: призраки + ввод
			laneColorStart = '#008a87';
			laneColorEnd = '#004a49';
		} else {
			// белёсая: без призраков
			laneColorStart = '#0b1120';
			laneColorEnd = '#020617';
		}

		// дорожка (скруглённая)
		ctx.save();
		const r = 18;
		const x0 = paddingX;
		const y0 = laneY;
		const x1 = paddingX + laneWidth;
		const y1 = laneY + laneHeight;

		ctx.beginPath();
		ctx.moveTo(x0 + r, y0);
		ctx.lineTo(x1 - r, y0);
		ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
		ctx.lineTo(x1, y1 - r);
		ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
		ctx.lineTo(x0 + r, y1);
		ctx.quadraticCurveTo(x0, y1, x0, y1 - r);
		ctx.lineTo(x0, y0 + r);
		ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
		ctx.closePath();

		const laneGradient = ctx.createLinearGradient(x0, y0, x1, y1);
		laneGradient.addColorStop(0, laneColorStart);
		laneGradient.addColorStop(1, laneColorEnd);
		ctx.fillStyle = laneGradient;
		ctx.fill();

		ctx.strokeStyle = 'rgba(148,163,184,0.8)';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.restore();

		// центральный шарик
		ctx.save();
		ctx.beginPath();
		ctx.arc(centerX, laneCenterY, laneHeight * 0.25, 0, Math.PI * 2);
		ctx.fillStyle = '#e5e7eb';
		ctx.shadowColor = 'rgba(59,130,246,0.85)';
		ctx.shadowBlur = 20;
		ctx.fill();
		ctx.restore();

		const speedPxPerMs = laneWidth / intervalDuration;

		// динамическая сетка по шагам
		ctx.save();
		const intervalsGridToShow = 2;
		for (
			let interval = currentInterval - intervalsGridToShow;
			interval <= currentInterval + intervalsGridToShow;
			interval++
		) {
			if (interval < 0 || interval >= totalIntervals) continue;

			for (let stepIdx = 0; stepIdx <= stepsPerInterval; stepIdx++) {
				const lineTimeRel = interval * intervalDuration + stepIdx * stepDuration;
				const x = centerX + (lineTimeRel - elapsedRel) * speedPxPerMs;

				if (x < x0 || x > x1) continue;

				const isMainBeat = stepIdx % 4 === 0;
				const isHalfBeat = stepIdx % 2 === 0 && !isMainBeat;

				if (isMainBeat) {
					ctx.strokeStyle = 'rgba(148,163,184,0.6)';
					ctx.lineWidth = 1.2;
				} else if (isHalfBeat) {
					ctx.strokeStyle = 'rgba(148,163,184,0.35)';
					ctx.lineWidth = 0.8;
				} else {
					ctx.strokeStyle = 'rgba(148,163,184,0.18)';
					ctx.lineWidth = 0.5;
				}

				ctx.beginPath();
				ctx.moveTo(x, laneY + 6);
				ctx.lineTo(x, laneY + laneHeight - 6);
				ctx.stroke();
			}
		}
		ctx.restore();

		// флажки конца интервалов — толстая палка + флажочек
		const maxIntervalsToShowFlags = 2;
		for (
			let interval = currentInterval - maxIntervalsToShowFlags;
			interval <= currentInterval + maxIntervalsToShowFlags;
			interval++
		) {
			if (interval < 0 || interval >= totalIntervals) continue;

			const flagTimeRel = (interval + 1) * intervalDuration;
			const flagX = centerX + (flagTimeRel - elapsedRel) * speedPxPerMs;

			if (flagX > x0 && flagX < x1) {
				ctx.save();

				// палка
				ctx.beginPath();
				ctx.moveTo(flagX, laneY);
				ctx.lineTo(flagX, laneY + laneHeight);
				ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
				ctx.lineWidth = 3;
				ctx.setLineDash([10, 6]);
				ctx.stroke();

				// флажочек сверху
				ctx.beginPath();
				const flagTopY = laneY - 4;
				ctx.moveTo(flagX, flagTopY);
				ctx.lineTo(flagX + 14, flagTopY - 12);
				ctx.lineTo(flagX, flagTopY - 8);
				ctx.closePath();
				ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
				ctx.fill();

				// === ДОБАВЛЕН ТЕКСТ НАД НУЖНЫМ ФЛАЖКОМ ===
				// interval == sampleRepeats - 1 — это конец демонстрации
				// значит следующий интервал (interval+1) — первый с вводом
				if (interval === sampleRepeats - 1) {
					const text = 'Начинайте кликать после флажка';
					ctx.font = '600 14px system-ui';
					ctx.fillStyle = 'rgba(255,255,255,0.95)';
					ctx.textAlign = 'center';

					// положение текста над флажком
					ctx.fillText(text, flagX, laneY - 28);
				}

				if (interval === sampleRepeats + 1) {
					const text = 'Теперь без помощи';
					ctx.font = '600 14px system-ui';
					ctx.fillStyle = 'rgba(255,255,255,0.95)';
					ctx.textAlign = 'center';

					// положение текста над флажком
					ctx.fillText(text, flagX, laneY - 28);
				}

				ctx.restore();
			}
		}

		// призрачные шары (первые 4 прохода)
		const intervalsGhostToShow = 2;
		for (
			let interval = currentInterval - intervalsGhostToShow;
			interval <= currentInterval + intervalsGhostToShow;
			interval++
		) {
			if (interval < 0 || interval >= totalIntervals) continue;

			const hasGhosts = interval < sampleRepeats + tapRepeatsWithGhosts; // 0–3

			if (!hasGhosts) continue;

			for (const note of melody) {
				const noteTimeRel = interval * intervalDuration + note.step * stepDuration;
				const x = centerX + (noteTimeRel - elapsedRel) * speedPxPerMs;
				if (x < x0 || x > x1) continue;

				const isNow = Math.abs(noteTimeRel - elapsedRel) < 80;
				const baseR = laneHeight * 0.16;
				const rNote = isNow ? baseR * 1.15 : baseR;

				ctx.save();
				ctx.beginPath();
				ctx.arc(x, laneCenterY, rNote, 0, Math.PI * 2);
				ctx.fillStyle = isNow ? 'rgba(74,222,128,0.92)' : 'rgba(148,163,184,0.8)';
				ctx.shadowColor = isNow ? 'rgba(74,222,128,0.8)' : 'rgba(148,163,184,0.35)';
				ctx.shadowBlur = isNow ? 18 : 10;
				ctx.fill();
				ctx.restore();
			}
		}

		// нажатия пользователя
		ctx.save();
		ctx.fillStyle = '#60a5fa';
		for (const tap of userAttempts) {
			const tapTimeRel = tap.timeRel;
			const x = centerX + (tapTimeRel - elapsedRel) * speedPxPerMs;
			if (x < x0 || x > x1) continue;

			ctx.beginPath();
			ctx.arc(x, laneCenterY, laneHeight * 0.14, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	// ===== Жизненный цикл =====
	onMount(() => {
		generateMelody();
		initCanvas();
		drawIdle();

		try {
			if (window) {
				window.removeEventListener('resize', handleResize);
			}
		} catch (e) {
			console.log(e);
		}
	});

	onDestroy(() => {
		try {
			if (window) {
				window.removeEventListener('resize', handleResize);
			}
		} catch (e) {
			console.log(e);
		}

		if (animationFrame !== null) cancelAnimationFrame(animationFrame);
	});
</script>

<div class="rhythm-game">
	<div class="rhythm-header">
		<h2 class="title">Ритмический тест</h2>
		<p class="subtitle">
			Сложность ритма: {difficulty === 'easy'
				? 'Лёгкий'
				: difficulty === 'medium'
					? 'Средний'
					: 'Сложный'}
		</p>
	</div>

	<div class="canvas-shell">
		<canvas bind:this={canvas} on:click={handleCanvasClick}></canvas>
		{#if !gameInitialized}
			<div class="start-overlay flex flex-col">
				<div class="overlay-text text-lg font-bold flex flex-col whitespace-pre-line">
					1. Запоминайте ритм
					2. Повторяйте ритм с подсказками
					3. Повторяйте ритм без подсказок

					Для старта нажмите кнопку "Начать"
				</div>
			</div>
		{/if}
	</div>

	<button class="tap-button hover:brightness-110" on:click={handleTapButton}
		>{!gameInitialized ? 'Начать' : 'Нажимайте в ритм'}</button
	>

	<div class="legend">
		<div class="legend-item">
			<span class="legend-dot ghost"></span>
			<span>Подсказки</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot user"></span>
			<span>Ваши нажатия</span>
		</div>
	</div>
</div>

<style>
	.rhythm-game {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		box-sizing: border-box;
		/* background: radial-gradient(circle at top, #111827 0, #020617 60%); */
		background: transparent;
		border-radius: 1.25rem;
		box-shadow: 0 20px 35px rgba(15, 23, 42, 0.6);

		width: 100%;
	}

	.rhythm-header {
		text-align: center;
		max-width: 520px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.title {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: #f9fafb;
	}

	.subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: #cbd5f5;
	}

	.canvas-shell {
		position: relative;
		width: min(700px, 100%);
		aspect-ratio: 16 / 7;
		border-radius: 1rem;
		overflow: hidden;
		background: #020617;
		border: 1px solid rgba(148, 163, 184, 0.4);
		box-shadow: inset 0 0 40px rgba(15, 23, 42, 0.9);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
		cursor: pointer;
	}

	.start-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle at center, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.95));
	}

	.overlay-card {
		max-width: 360px;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		background: rgba(15, 23, 42, 0.95);
		border: 1px solid rgba(148, 163, 184, 0.6);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
	}

	.overlay-title {
		font-size: 1rem;
		font-weight: 600;
		color: #e5e7eb;
		margin-bottom: 0.25rem;
		text-align: center;
	}

	.overlay-text {
		font-size: 0.85rem;
		color: #cbd5f5;
		text-align: center;
	}

	.tap-button {
		margin-top: 0.25rem;
		padding: 0.6rem 1.5rem;
		border-radius: 999px;
		border: none;
		font-size: 1.7rem;
		font-weight: 500;
		background: radial-gradient(circle at top, #3b82f6, #1d4ed8);
		color: white;
		cursor: pointer;
		box-shadow: 0 10px 25px rgba(37, 99, 235, 0.45);
		transform: translateY(0);
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease,
			filter 0.12s ease;
	}

	.tap-button:active {
		transform: translateY(1px) scale(0.98);
		box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
		filter: brightness(0.98);
	}

	.legend {
		margin-top: 0.25rem;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		display: inline-block;
	}

	.legend-dot.ghost {
		background: rgba(148, 163, 184, 0.85);
	}

	.legend-dot.user {
		background: #60a5fa;
	}
</style>
