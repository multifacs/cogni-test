import type {
	SimonBlock,
	SimonColor,
	SimonCongruency,
	SimonPosition,
	SimonResult,
	SimonTrial
} from '../types';

/**
 * Чистый движок «Задания Симона» (конфликтная парадигма стимул–ответ).
 * Никакой UI-логики: только константы, планирование сессии и оценка
 * ответа. Паттерн — corsi-block/logic/engine.ts (детерминизм от
 * инжектированного rng, fail-loud guards, русские док-комментарии).
 */

// ---------------------------------------------------------------------------
// Константы расписания блоков
// ---------------------------------------------------------------------------

/** Проб в блоке 1 (красный/синий в центре, ответ по цвету). */
export const BLOCK1_TRIALS = 5;
/** Проб в блоке 2 (красный/синий слева/справа, ответ по цвету). */
export const BLOCK2_TRIALS = 10;
/** Проб в блоке 3 (4 цвета × 4 позиции, ответ по цвету). */
export const BLOCK3_TRIALS = 20;
/** Всего проб за сессию: 5 + 10 + 20. */
export const TOTAL_TRIALS = BLOCK1_TRIALS + BLOCK2_TRIALS + BLOCK3_TRIALS;

// ---------------------------------------------------------------------------
// Тайминги для будущего UI (движок их не использует — только отдаёт)
// ---------------------------------------------------------------------------

/**
 * Окно ответа на пробу, мс. По истечении — таймаут (isCorrect false,
 * timedOut true, responseTimeMs = RESPONSE_WINDOW_MS).
 */
export const RESPONSE_WINDOW_MS = 3000;
/**
 * Длительность фазы обратной связи, мс. 800 — компромисс: достаточно,
 * чтобы заметить подсветку верно/неверно, но не срывает темп пробы
 * (короче фидбека corsi, т.к. проб в сессии 35 и задача темповая).
 */
export const FEEDBACK_MS = 800;
/**
 * Межпробный интервал (ITI), мс. 500 — пауза между фидбеком и следующим
 * стимулом: гасит иконический след круга, чтобы позиция прошлой пробы
 * не накладывалась на следующую, и держит плотный темп предъявления.
 */
export const INTER_TRIAL_MS = 500;

// ---------------------------------------------------------------------------
// Отображение цвет → позиция кнопки ответа
// ---------------------------------------------------------------------------

/**
 * Каждому цвету соответствует фиксированная кнопка ответа: red→left,
 * blue→right, green→up, yellow→down. Конгруэнтность пробы определяется
 * именно по этому отображению: стимул конгруэнтен ⟺ его позиция совпала
 * с позицией кнопки его цвета.
 */
export const COLOR_TO_POSITION: Record<SimonColor, Exclude<SimonPosition, 'center'>> = {
	red: 'left',
	blue: 'right',
	green: 'up',
	yellow: 'down'
};

/** Цвета блока 1–2 (только красный/синий, круг в центре). */
const TWO_COLORS: readonly SimonColor[] = ['red', 'blue'];
/** Все четыре цвета блока 3. */
const FOUR_COLORS: readonly SimonColor[] = ['red', 'blue', 'green', 'yellow'];
/** Позиции блока 2 (круг слева или справа от центра). */
const TWO_POSITIONS: readonly Exclude<SimonPosition, 'center'>[] = ['left', 'right'];

/**
 * Type guard для парсинга цвета из внешних данных (например, из БД):
 * проверяет значение против допустимого множества цветов.
 */
export function isSimonColor(value: unknown): value is SimonColor {
	return typeof value === 'string' && FOUR_COLORS.includes(value as SimonColor);
}

// ---------------------------------------------------------------------------
// Внутренние помощники генерации
// ---------------------------------------------------------------------------

/**
 * Полный Fisher–Yates с инжектированным rng (как generateSequence в
 * corsi): перемешивает массив на месте и возвращает его. Любое
 * планирование порядка проб обязано идти через shuffle — единственный
 * источник случайности в порядке, поэтому детерминизм сессии целиком
 * определяется потоком rng.
 */
function shuffle<T>(items: T[], rng: () => number): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

/**
 * Планирует пробы блока 1: 5 кругов в центре, цвета red/blue сбалансированы
 * настолько, насколько возможно при нечётном объёме — 3/2 или 2/3.
 * Какая сторона получит 3, решает rng (честная монета). Порядок — shuffle.
 */
function buildBlock1Trials(rng: () => number, startIndex: number): SimonTrial[] {
	const redFirst = rng() < 0.5; // кто получит «лишнюю» пробу: 3 красных или 3 синих
	const colors: SimonColor[] = redFirst
		? ['red', 'red', 'red', 'blue', 'blue']
		: ['red', 'red', 'blue', 'blue', 'blue'];
	shuffle(colors, rng);
	return colors.map((color, i) => ({
		block: 1 as SimonBlock,
		trialIndex: startIndex + i,
		color,
		position: 'center' as SimonPosition, // стимул в центре — конфликта нет
		congruency: 'neutral' as SimonCongruency
	}));
}

/**
 * Планирует пробы блока 2: 10 кругов слева/справа, ответ по ЦВЕТУ.
 * Балансы: цвета 5/5 (red/blue), конгруэнтность 5/5 (congruent/incongruent).
 * Балансируются маргиналы: список цветов и список конгруэнтностей
 * перемешиваются независимо и сшиваются попарно — так возможны все
 * четыре комбинации (цвет × конгруэнтность) и нет систематического
 * перекоса «красный всегда конгруэнтен».
 * Позиция детерминированно выводится из конгруэнтности: конгруэнтная
 * проба стоит на позиции кнопки своего цвета, инконгруэнтная — на
 * противоположной (для red/blue пары left/right единственная альтернатива).
 */
function buildBlock2Trials(rng: () => number, startIndex: number): SimonTrial[] {
	const colors: SimonColor[] = Array.from({ length: BLOCK2_TRIALS }, (_, i) => TWO_COLORS[i % 2]); // red×5 + blue×5
	shuffle(colors, rng);
	const congruentFlags: boolean[] = Array.from({ length: BLOCK2_TRIALS }, (_, i) => i < BLOCK2_TRIALS / 2); // true×5 + false×5
	shuffle(congruentFlags, rng);
	return colors.map((color, i) => {
		const congruent = congruentFlags[i];
		const buttonPosition = COLOR_TO_POSITION[color]; // 'left' для red, 'right' для blue
		// Единственная «другая» позиция на горизонтальной оси:
		// конгруэнтно — позиция кнопки цвета, инконгруэнтно — противоположная.
		const position: SimonPosition = congruent
			? buttonPosition
			: TWO_POSITIONS.find((p) => p !== buttonPosition)!;
		return {
			block: 2 as SimonBlock,
			trialIndex: startIndex + i,
			color,
			position,
			congruency: (congruent ? 'congruent' : 'incongruent') as SimonCongruency
		};
	});
}

/**
 * Планирует пробы блока 3: 20 кругов, 4 цвета × 4 позиции, ответ по цвету.
 * Балансы: цвета 5/5/5/5, конгруэнтность 10/10. Как и в блоке 2,
 * балансируются маргиналы (независимые shuffle цветов и флагов
 * конгруэнтности, попарная сшивка). Позиция: конгруэнтная проба стоит
 * на позиции кнопки своего цвета; инконгруэнтная — на одной из трёх
 * оставшихся позиций, выбор отдан rng.
 */
function buildBlock3Trials(rng: () => number, startIndex: number): SimonTrial[] {
	const colors: SimonColor[] = Array.from({ length: BLOCK3_TRIALS }, (_, i) => FOUR_COLORS[i % 4]); // каждый цвет × 5
	shuffle(colors, rng);
	const congruentFlags: boolean[] = Array.from({ length: BLOCK3_TRIALS }, (_, i) => i < BLOCK3_TRIALS / 2); // true×10 + false×10
	shuffle(congruentFlags, rng);
	return colors.map((color, i) => {
		const buttonPosition = COLOR_TO_POSITION[color];
		let position: SimonPosition;
		if (congruentFlags[i]) {
			position = buttonPosition;
		} else {
			// Инконгруэнтная позиция — любая из трёх НЕ-кнопочных, выбор rng.
			const others = (Object.values(COLOR_TO_POSITION) as Exclude<SimonPosition, 'center'>[]).filter(
				(p) => p !== buttonPosition
			);
			position = others[Math.floor(rng() * others.length)]!;
		}
		return {
			block: 3 as SimonBlock,
			trialIndex: startIndex + i,
			color,
			position,
			congruency: (congruentFlags[i] ? 'congruent' : 'incongruent') as SimonCongruency
		};
	});
}

// ---------------------------------------------------------------------------
// Публичное API
// ---------------------------------------------------------------------------

/**
 * Планирует полную сессию из 35 проб (5 + 10 + 20). Детерминирована
 * потоком rng: один и тот же rng-поток (один и тот же сид) даёт
 * побайтово ту же сессию.
 *
 * Гарантируемые инварианты (проверяются тестами):
 * - блок 1: 5 проб, цвета 3/2 или 2/3 (решает rng), позиция 'center',
 *   конгруэнтность 'neutral';
 * - блок 2: 10 проб, цвета red/blue 5/5, конгруэнтность 5/5;
 * - блок 3: 20 проб, цвета 5/5/5/5, конгруэнтность 10/10;
 * - trialIndex сквозной 1..35, блоки идут по порядку 1 → 2 → 3;
 * - порядок проб внутри блока — shuffle(rng).
 */
export function buildSession(rng: () => number): SimonTrial[] {
	return [
		...buildBlock1Trials(rng, 1),
		...buildBlock2Trials(rng, BLOCK1_TRIALS + 1),
		...buildBlock3Trials(rng, BLOCK1_TRIALS + BLOCK2_TRIALS + 1)
	];
}

/**
 * Оценивает ответ на пробу. pressedColor === null означает таймаут:
 * timedOut = true, responseTimeMs принудительно равен windowMs,
 * isCorrect = false. Правильность ответа — строгое совпадение цвета.
 *
 * Fail-loud guard: responseTimeMs < 0 или > windowMs — throw. Это
 * защитный контракт: UI обязан передавать время внутри окна; значения
 * вне окна — баг интеграции, а не «почти правильный» ответ.
 */
export function evaluateTrial(
	trial: SimonTrial,
	pressedColor: SimonColor | null,
	responseTimeMs: number,
	windowMs = RESPONSE_WINDOW_MS
): SimonResult {
	if (!Number.isFinite(responseTimeMs) || responseTimeMs < 0 || responseTimeMs > windowMs) {
		throw new Error(
			`evaluateTrial: responseTimeMs должен быть в [0, ${windowMs}], получил ${responseTimeMs}`
		);
	}
	const timedOut = pressedColor === null;
	const effectiveMs = timedOut ? windowMs : responseTimeMs;
	return {
		block: trial.block,
		trialIndex: trial.trialIndex,
		color: trial.color,
		position: trial.position,
		congruency: trial.congruency,
		isCorrect: !timedOut && pressedColor === trial.color,
		responseTimeMs: effectiveMs,
		timedOut
	};
}

/**
 * Мета сессии для payload результатов (значения — строки, т.к. колонка
 * meta в БД текстовая). Паттерн — buildMeta в corsi-block.
 */
export function buildMeta(): Record<string, string> {
	return {
		blocks: `${BLOCK1_TRIALS}+${BLOCK2_TRIALS}+${BLOCK3_TRIALS}`,
		windowMs: String(RESPONSE_WINDOW_MS)
	};
}
