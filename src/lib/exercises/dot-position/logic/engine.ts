import type { DotPositionResult } from '../types';

/** Длительность фазы показа точки (запоминание), мс. */
export const TIME_MEMORIZE_MS = 5000;
/** Длительность фазы ответа, мс; нетап тарифицируется как полный таймаут. */
export const TIME_RESPOND_MS = 5000;
/** Точек (раундов) на один этап. */
export const DOTS_PER_STAGE = 3;
/** Радиус допуска: доля меньшей стороны поля. */
export const HIT_WINDOW = 0.1;
/**
 * Отступ случайной позиции от края поля в относительных единицах.
 * Должен быть >= HIT_WINDOW, чтобы круг допуска не резался краем панели.
 */
export const EDGE_MARGIN = 0.1;

export type Position = { x: number; y: number };

/** Конфигурация этапа: grid — размер видимой сетки, 0 = без сетки. */
export type StageConfig = { grid: number };

export const STAGES: readonly [StageConfig, StageConfig, StageConfig] = [
	{ grid: 5 },
	{ grid: 3 },
	{ grid: 0 }
];

export type DotPositionPhase = 'memorize' | 'respond' | 'finished';

/**
 * Чистое состояние автомата одного упражнения.
 * Фаза на шаге: показ (memorize) → скрытие/ответ (respond) → тап|таймаут →
 * nextRound(...) → следующий раунд (или finished после 9-го).
 */
export type RoundState = {
	stage: 1 | 2 | 3;
	roundInStage: number; // 1..DOTS_PER_STAGE
	attempt: number; // 1..3*DOTS_PER_STAGE, сквозной индекс раунда
	phase: DotPositionPhase;
	position: Position;
	correctCount: number;
	errorCount: number;
};

/** Равномерная позиция внутри [EDGE_MARGIN .. 1 - EDGE_MARGIN] по обеим осям. */
export function randomPosition(rng: () => number): Position {
	const span = 1 - 2 * EDGE_MARGIN;
	return {
		x: EDGE_MARGIN + rng() * span,
		y: EDGE_MARGIN + rng() * span
	};
}

/** Евклидово расстояние между двумя точками в относительных единицах. */
export function distance(a: Position, b: Position): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Попадание: расстояние тап→точка <= HIT_WINDOW (граница включительно). */
export function isHit(position: Position, tap: Position): boolean {
	return distance(position, tap) <= HIT_WINDOW;
}

/**
 * Переводит пиксельные координаты тапа в относительные единицы поля.
 *
 * Нормализация честная относительно неквадратной панели: обе оси делятся на
 * ОДНУ и ту же величину — меньшую сторону панели (minSide). Тогда евклидово
 * расстояние в относительных единицах инвариантно к пропорциям панели: круг
 * допуска HIT_WINDOW * minSide остаётся кругом в пикселях при любом
 * соотношении сторон, и HIT_WINDOW действительно равен доле меньшей стороны.
 * Квадратное игровое поле [0..minSide]² отсчитывается от origin (левый верхний
 * угол панели); сгенерированные позиции [EDGE_MARGIN .. 1-EDGE_MARGIN] всегда
 * лежат внутри этого квадрата независимо от того, какая сторона меньше.
 */
export function normalizeTap(
	panelRect: { width: number; height: number },
	clientX: number,
	clientY: number,
	originLeft: number,
	originTop: number
): Position {
	const minSide = Math.min(panelRect.width, panelRect.height);
	return {
		x: (clientX - originLeft) / minSide,
		y: (clientY - originTop) / minSide
	};
}

/** Начальное состояние: этап 1, раунд 1, фаза показа. */
export function createRoundState(rng: () => number): RoundState {
	return {
		stage: 1,
		roundInStage: 1,
		attempt: 1,
		phase: 'memorize',
		position: randomPosition(rng),
		correctCount: 0,
		errorCount: 0
	};
}

/**
 * Оценивает завершённый раунд: тап относительно позиции точки.
 *
 * Тап валиден только в фазе 'respond' — иначе throw (fail-fast guard):
 * UI обязан вызывать evaluateRound только в respond-фазе.
 * tap = null означает таймаут — correct=false, distance=null (расстояние
 * не определено), а параметр reactionMs игнорируется и используется
 * TIME_RESPOND_MS.
 */
export function evaluateRound(
	state: RoundState,
	tap: Position | null,
	reactionMs: number
): DotPositionResult {
	if (state.phase !== 'respond') {
		throw new Error(`evaluateRound: tap accepted only in respond phase, got '${state.phase}'`);
	}
	if (tap === null) {
		return {
			attempt: state.attempt,
			stage: state.stage,
			reactionMs: TIME_RESPOND_MS,
			correct: false,
			distance: null
		};
	}
	return {
		attempt: state.attempt,
		stage: state.stage,
		reactionMs,
		correct: isHit(state.position, tap),
		distance: distance(state.position, tap)
	};
}

/**
 * Чистый шаг автомата: поглощает исход раунда (тап или таймаут) и возвращает
 * состояние следующего раунда. После attempt = 3*DOTS_PER_STAGE (9) — фаза
 * 'finished', счётчики и позиция финального состояния не меняются.
 */
export function nextRound(
	state: RoundState,
	outcome: DotPositionResult,
	rng: () => number
): RoundState {
	if (state.phase === 'finished') {
		return state;
	}
	const correctCount = state.correctCount + (outcome.correct ? 1 : 0);
	const errorCount = state.errorCount + (outcome.correct ? 0 : 1);

	if (state.attempt >= DOTS_PER_STAGE * STAGES.length) {
		return { ...state, phase: 'finished', correctCount, errorCount };
	}

	const nextAttempt = state.attempt + 1;
	const stage = Math.floor((nextAttempt - 1) / DOTS_PER_STAGE) + 1;
	return {
		stage: stage as 1 | 2 | 3,
		roundInStage: ((nextAttempt - 1) % DOTS_PER_STAGE) + 1,
		attempt: nextAttempt,
		phase: 'memorize',
		position: randomPosition(rng),
		correctCount,
		errorCount
	};
}

/** Мета упражнения для сохранения в сессию (значения — строки). */
export function buildMeta(): { dotsPerStage: string; windowSize: string } {
	return {
		dotsPerStage: String(DOTS_PER_STAGE),
		windowSize: String(HIT_WINDOW)
	};
}
