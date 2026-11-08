import type { CorsiBlockResult } from '../types';

/** Квадратов на игровом поле; доска одна на всю сессию. */
export const BOARD_SQUARES = 9;
/** Всего заходов (подсвет → воспроизведение) на одну сессию. */
export const TOTAL_ROUNDS = 9;
/** Стартовая длина последовательности (первый заход — 3 подсвета). */
export const START_SEQUENCE_LENGTH = 3;
/**
 * Длины 3..NO_REPEAT_MAX_LENGTH генерируются из РАЗЛИЧНЫХ индексов квадратов
 * (квадратов хватает: 6 <= BOARD_SQUARES). Длины >= 7 без повторов невозможны
 * на 9 квадратах, поэтому повторы разрешены — но запрещён немедленный повтор
 * того же квадрата подряд (иначе фаза показа вырождается в длинную подсветку
 * одного квадрата и теряет нагрузку на рабочую память).
 */
export const NO_REPEAT_MAX_LENGTH = 6;
/** Лимит времени фазы ответа, мс; нетап/таймаут тарифицируется как полный таймаут. */
export const ANSWER_TIMEOUT_MS = 15000;
/** Сторона квадрата в долях меньшей стороны поля (см. normalizeTap-подход dot-position). */
export const SQUARE_SIZE = 0.12;
/**
 * Отступ центра квадрата от края поля: центр гуляет в
 * [BOARD_PADDING .. 1 - BOARD_PADDING] по обеим осям, поэтому квадрат со
 * стороной SQUARE_SIZE целиком внутри поля при BOARD_PADDING >= SQUARE_SIZE/2
 * (0.16 >= 0.06 — инвариант с запасом). Борт: край квадрата проходит не
 * ближе ~10% поля (0.16 - SQUARE_SIZE/2 = 0.10) — раскладка «воздушнее»,
 * квадраты не прижаты к краям панели.
 */
export const BOARD_PADDING = 0.16;
/**
 * Минимальный зазор между КРАЯМИ квадратов (>= 6% поля): попарная дистанция
 * центров должна быть >= SQUARE_SIZE + MIN_GAP, чтобы соседние квадраты
 * визуально не сливались и каждый подсвет читался однозначно.
 */
export const MIN_GAP = 0.06;
/** Лимит rejection sampling для generateBoard; исчерпание = throw (fail loud). */
export const MAX_BOARD_GEN_ATTEMPTS = 1000;
/** Перезапуск раскладки доски после стольких подряд отклонённых кандидатов. */
const BOARD_RESTART_AFTER_REJECTS = 100;

/** Тайминги фаз для UI (движок их не использует — только отдаёт константами). */
/** Длительность интро-фазы перед первым заходом, мс. */
export const INTRO_MS = 2000;
/** Длительность подсвета одного квадрата в фазе показа, мс. */
export const PRESENT_MS = 600;
/** Пауза между подсветами внутри последовательности, мс. */
export const GAP_MS = 250;
/** Длительность фазы обратной связи после ответа, мс. */
export const FEEDBACK_MS = 1000;

/** Позиция на поле в относительных единицах (доля меньшей стороны). */
export type Position = { x: number; y: number };

/** Фазы автомата: интро → показ → ответ → фидбек → nextRound → … → finished. */
export type CorsiPhase = 'intro' | 'presentation' | 'recall' | 'feedback' | 'finished';

/**
 * Чистое состояние автомата одного упражнения. Доска (board) живёт в
 * состоянии и не меняется между заходами — одна на сессию; sequence —
 * индексы квадратов board для текущего захода. intro однократная — только
 * на старте игры; каждый следующий заход начинается с presentation.
 */
export type RoundState = {
	attempt: number; // 1..TOTAL_ROUNDS, сквозной номер захода
	sequenceLength: number; // длина sequence текущего захода
	phase: CorsiPhase;
	board: Position[]; // BOARD_SQUARES позиций, фиксирована на сессию
	sequence: number[]; // индексы board, длина = sequenceLength
	correctCount: number;
	errorCount: number;
};

/** Евклидово расстояние между двумя точками в относительных единицах. */
export function distance(a: Position, b: Position): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Случайная доска из BOARD_SQUARES позиций: rejection sampling по одной
 * позиции за раз — центр в [BOARD_PADDING .. 1 - BOARD_PADDING] по обеим
 * осям, попарная дистанция до уже принятых >= SQUARE_SIZE + MIN_GAP.
 * После BOARD_RESTART_AFTER_REJECTS подряд отклонённых кандидатов раскладка
 * перезапускается с нуля (локальный тупик не должен съедать весь бюджет).
 * Исчерпание MAX_BOARD_GEN_ATTEMPTS кандидатами — throw: это баг генерации
 * или несовместимые константы, а не «почти хорошая» доска.
 */
export function generateBoard(rng: () => number): Position[] {
	let attempts = 0;
	while (attempts < MAX_BOARD_GEN_ATTEMPTS) {
		const board: Position[] = [];
		let consecutiveRejects = 0;
		while (board.length < BOARD_SQUARES && attempts < MAX_BOARD_GEN_ATTEMPTS) {
			const candidate: Position = {
				x: BOARD_PADDING + rng() * (1 - 2 * BOARD_PADDING),
				y: BOARD_PADDING + rng() * (1 - 2 * BOARD_PADDING)
			};
			attempts += 1;
			const conflicts = board.some(
				(placed) => distance(placed, candidate) < SQUARE_SIZE + MIN_GAP
			);
			if (conflicts) {
				consecutiveRejects += 1;
				if (consecutiveRejects >= BOARD_RESTART_AFTER_REJECTS) break; // тупик → новая раскладка
			} else {
				board.push(candidate);
				consecutiveRejects = 0;
			}
		}
		if (board.length === BOARD_SQUARES) return board;
	}
	throw new Error(
		`generateBoard: не удалось разместить ${BOARD_SQUARES} квадратов за ${MAX_BOARD_GEN_ATTEMPTS} попыток (SQUARE_SIZE=${SQUARE_SIZE}, MIN_GAP=${MIN_GAP})`
	);
}

/**
 * Случайная последовательность индексов квадратов 0..BOARD_SQUARES-1.
 * length <= NO_REPEAT_MAX_LENGTH — все индексы различные (частичный
 * Fisher–Yates без возвращения). length > NO_REPEAT_MAX_LENGTH — повторы
 * разрешены, но последовательных дублей нет: каждый следующий элемент не
 * равен предыдущему. length < 1 — throw (fail-fast).
 */
export function generateSequence(rng: () => number, length: number): number[] {
	if (length < 1) {
		throw new Error(`generateSequence: length должен быть >= 1, получил ${length}`);
	}
	if (length <= NO_REPEAT_MAX_LENGTH) {
		const indices = Array.from({ length: BOARD_SQUARES }, (_, i) => i);
		for (let i = 0; i < length; i++) {
			const swapWith = i + Math.floor(rng() * (BOARD_SQUARES - i));
			[indices[i], indices[swapWith]] = [indices[swapWith], indices[i]];
		}
		return indices.slice(0, length);
	}
	const sequence: number[] = [];
	while (sequence.length < length) {
		const candidate = Math.floor(rng() * BOARD_SQUARES);
		if (sequence.length === 0 || candidate !== sequence[sequence.length - 1]) {
			sequence.push(candidate);
		}
	}
	return sequence;
}

/** Начальное состояние: заход 1, фаза интро, свежая доска и последовательность. */
export function createGameState(rng: () => number): RoundState {
	return {
		attempt: 1,
		sequenceLength: START_SEQUENCE_LENGTH,
		phase: 'intro',
		board: generateBoard(rng),
		sequence: generateSequence(rng, START_SEQUENCE_LENGTH),
		correctCount: 0,
		errorCount: 0
	};
}

/**
 * Оценивает завершённый заход: clicks — индексы квадратов в порядке нажатия.
 *
 * Ответ валиден только в фазе 'recall' — иначе throw (fail-fast guard):
 * UI обязан вызывать evaluateRound только в recall-фазе. Правильно, когда
 * длина кликов совпадает с длином последовательности и каждый индекс на
 * своей позиции. answerMs пробрасывается как есть: таймаут UI тарифицирует
 * как ANSWER_TIMEOUT_MS.
 */
export function evaluateRound(
	state: RoundState,
	clicks: number[],
	answerMs: number
): CorsiBlockResult {
	if (state.phase !== 'recall') {
		throw new Error(
			`evaluateRound: ответ принимается только в recall-фазе, получил '${state.phase}'`
		);
	}
	const isCorrect =
		clicks.length === state.sequence.length &&
		state.sequence.every((index, i) => clicks[i] === index);
	return {
		attempt: state.attempt,
		sequenceLength: state.sequenceLength,
		isCorrect,
		answerMs
	};
}

/**
 * Чистый шаг автомата: поглощает исход захода и возвращает состояние
 * следующего. Верный ответ удлиняет последовательность на 1, неверный —
 * оставляет длину, но последовательность ВСЕГДА новая (решение владельца,
 * вариант B: на ошибке нельзя показывать ту же). После attempt =
 * TOTAL_ROUNDS — фаза 'finished', счётчики обновляются, остальное не
 * меняется. Из finished состояние идемпотентно возвращается как есть.
 */
export function nextRound(
	state: RoundState,
	outcome: CorsiBlockResult,
	rng: () => number
): RoundState {
	if (state.phase === 'finished') {
		return state;
	}
	const correctCount = state.correctCount + (outcome.isCorrect ? 1 : 0);
	const errorCount = state.errorCount + (outcome.isCorrect ? 0 : 1);

	if (state.attempt >= TOTAL_ROUNDS) {
		return { ...state, phase: 'finished', correctCount, errorCount };
	}

	const sequenceLength = outcome.isCorrect ? state.sequenceLength + 1 : state.sequenceLength;
	return {
		attempt: state.attempt + 1,
		sequenceLength,
		phase: 'presentation',
		board: state.board,
		sequence: generateSequence(rng, sequenceLength),
		correctCount,
		errorCount
	};
}

/** Мета упражнения для сохранения в сессию (значения — строки). */
export function buildMeta(): { rounds: string; startLength: string; answerTimeoutMs: string } {
	return {
		rounds: String(TOTAL_ROUNDS),
		startLength: String(START_SEQUENCE_LENGTH),
		answerTimeoutMs: String(ANSWER_TIMEOUT_MS)
	};
}
