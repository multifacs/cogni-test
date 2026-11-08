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
 * Никакой UI-логики: только константы, генерация проб и оценка ответа.
 *
 * Сессия больше не состоит из фиксированного числа проб: каждая часть
 * идёт на время (10 / 30 / 60 с), а пробы генерируются непрерывно, пока
 * не истечёт таймер части. Поэтому вместо buildSession здесь живёт
 * поточный генератор createTrialSource(rng).
 *
 * Паттерн — corsi-block/logic/engine.ts (детерминизм от инжектированного
 * rng, fail-loud guards, русские док-комментарии).
 */

// ---------------------------------------------------------------------------
// Константы расписания блоков
// ---------------------------------------------------------------------------

/** Длительность каждой части, мс. Части идут непрерывно, пока не вышло время. */
export const BLOCK_DURATIONS_MS: Record<SimonBlock, number> = {
	1: 10_000,
	2: 30_000,
	3: 60_000
};

/**
 * Длительность фазы обратной связи после ответа, мс. Короткая вспышка:
 * в темповой задаче на время фидбек не должен съедать значимую долю части.
 */
export const FEEDBACK_MS = 200;

// ---------------------------------------------------------------------------
// Отображение цвет → позиция стрелки ответа
// ---------------------------------------------------------------------------

/**
 * Каждому цвету соответствует фиксированная стрелка ответа: red→left,
 * blue→right, green→up, yellow→down. Конгруэнтность пробы определяется
 * именно по этому отображению: стимул конгруэнтен ⟺ его позиция совпала
 * с направлением стрелки его цвета.
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
/** Все направления стрелок блока 3. */
const ALL_POSITIONS: readonly Exclude<SimonPosition, 'center'>[] = ['left', 'right', 'up', 'down'];

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
 * Собирает «мешок» проб одного блока. Мешок — это порция, внутри которой
 * соблюдены балансы; когда он исчерпан, генерируется следующий. Так любой
 * префикс блока остаётся сбалансированным, а не только сессия целиком.
 *
 * - блок 1: 2 пробы, red/blue по одной, центр, neutral;
 * - блок 2: 2 пробы, red/blue по одной, конгруэнтность 1:1;
 * - блок 3: 4 пробы, каждый цвет по одному, конгруэнтность 2:2.
 */
function buildBag(block: SimonBlock, rng: () => number): SimonTrial[] {
	if (block === 1) {
		return shuffle([...TWO_COLORS], rng).map((color) => ({
			block: 1,
			color,
			position: 'center' as SimonPosition, // стимул в центре — конфликта нет
			congruency: 'neutral' as SimonCongruency
		}));
	}

	if (block === 2) {
		const colors = shuffle([...TWO_COLORS], rng);
		const congruentFlags = shuffle([true, false], rng);
		return colors.map((color, i) => {
			const congruent = congruentFlags[i]!;
			const buttonPosition = COLOR_TO_POSITION[color]; // 'left' для red, 'right' для blue
			// Конгруэнтно — позиция стрелки цвета, инконгруэнтно — противоположная.
			const position: SimonPosition = congruent
				? buttonPosition
				: TWO_POSITIONS.find((p) => p !== buttonPosition)!;
			return {
				block: 2,
				color,
				position,
				congruency: (congruent ? 'congruent' : 'incongruent') as SimonCongruency
			};
		});
	}

	const colors = shuffle([...FOUR_COLORS], rng);
	const congruentFlags = shuffle([true, true, false, false], rng);
	return colors.map((color, i) => {
		const buttonPosition = COLOR_TO_POSITION[color];
		let position: SimonPosition;
		if (congruentFlags[i]) {
			position = buttonPosition;
		} else {
			// Инконгруэнтная позиция — любая из трёх НЕ-стрелочных, выбор rng.
			const others = ALL_POSITIONS.filter((p) => p !== buttonPosition);
			position = others[Math.floor(rng() * others.length)]!;
		}
		return {
			block: 3,
			color,
			position,
			congruency: (congruentFlags[i] ? 'congruent' : 'incongruent') as SimonCongruency
		};
	});
}

// ---------------------------------------------------------------------------
// Публичное API
// ---------------------------------------------------------------------------

/** Поточный источник проб: UI запрашивает следующую пробу текущего блока. */
export type SimonTrialSource = {
	next(block: SimonBlock): SimonTrial;
};

/**
 * Создаёт детерминированный источник проб. Один и тот же rng-поток
 * (один и тот же сид) даёт побайтово ту же последовательность проб.
 *
 * Мешки блоков заполняются лениво, в том порядке, в котором UI запрашивает
 * блоки (сессия всегда идёт 1 → 2 → 3). При исчерпании мешок пополняется
 * из общего rng, поэтому вся последовательность однозначно определяется
 * потоком rng и порядком запросов.
 *
 * Гарантируемые инварианты (проверяются тестами):
 * - блок 1: только red/blue, позиция 'center', конгруэнтность 'neutral';
 * - блок 2: только red/blue, позиции left/right, конгруэнтность 1:1;
 * - блок 3: все 4 цвета, каждая позиция ≠ center, конгруэнтность 2:2;
 * - congruent ⟺ position === COLOR_TO_POSITION[color] (блоки 2–3).
 */
export function createTrialSource(rng: () => number): SimonTrialSource {
	const bags: Partial<Record<SimonBlock, SimonTrial[]>> = {};

	return {
		next(block) {
			let bag = bags[block];
			if (!bag || bag.length === 0) {
				bag = buildBag(block, rng);
				bags[block] = bag;
			}
			return bag.pop()!;
		}
	};
}

/**
 * Оценивает ответ на пробу. Правильность — строгое совпадение цвета.
 * Лимита на отдельную пробу нет: часть заканчивается по общему таймеру,
 * поэтому timedOut в новых сессиях всегда false (поле оставлено для
 * совместимости со старыми данными).
 *
 * Fail-loud guards: trialIndex < 1 или не целое, responseTimeMs < 0 или
 * не конечное — throw. Это защитный контракт: значения вне диапазона —
 * баг интеграции, а не «почти правильный» ответ.
 */
export function evaluateTrial(
	trial: SimonTrial,
	pressedColor: SimonColor,
	responseTimeMs: number,
	trialIndex: number
): SimonResult {
	if (!Number.isInteger(trialIndex) || trialIndex < 1) {
		throw new Error(`evaluateTrial: trialIndex должен быть целым ≥ 1, получил ${trialIndex}`);
	}
	if (!Number.isFinite(responseTimeMs) || responseTimeMs < 0) {
		throw new Error(
			`evaluateTrial: responseTimeMs должен быть конечным и ≥ 0, получил ${responseTimeMs}`
		);
	}
	return {
		block: trial.block,
		trialIndex,
		color: trial.color,
		position: trial.position,
		congruency: trial.congruency,
		isCorrect: pressedColor === trial.color,
		responseTimeMs,
		timedOut: false
	};
}

/**
 * Мета сессии для payload результатов (значения — строки, т.к. колонка
 * meta в БД текстовая). Длительности частей в мс: «10000+30000+60000».
 * Паттерн — buildMeta в corsi-block.
 */
export function buildMeta(): Record<string, string> {
	return {
		blockDurationsMs: `${BLOCK_DURATIONS_MS[1]}+${BLOCK_DURATIONS_MS[2]}+${BLOCK_DURATIONS_MS[3]}`
	};
}
