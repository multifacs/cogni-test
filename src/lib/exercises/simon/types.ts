/**
 * Типы упражнения «Задание Симона» (Simon task) — классическая
 * конфликтная парадигма стимул–ответ.
 *
 * Инварианты (см. logic/engine.ts):
 * - Блок 1: 5 проб, красный/синий круг в центре, ответ по цвету
 *   (конгруэнтность всегда 'neutral' — пространственного конфликта нет).
 * - Блок 2: 10 проб, красный/синий круг слева/справа, ответ по ЦВЕТУ,
 *   а не по позиции.
 * - Блок 3: 20 проб, 4 цвета (red/blue/green/yellow), 4 позиции
 *   (left/right/up/down), ответ по цвету.
 *
 * SimonResult — плоская сериализуемая строка БД (без методов, без Date):
 * позже регистрируется в ExerciseResultMap/ExerciseResult/ExerciseResults
 * как per-trial строка (паттерн CONVENTIONS.md). trialIndex — СКВОЗНОЙ
 * номер пробы 1..35 по всем трём блокам: это ключ сортировки при чтении
 * (asc(f.trialIndex)) в последующих задачах.
 */

/** Цвет стимула. В блоках 1–2 доступны только 'red' | 'blue'. */
export type SimonColor = 'red' | 'blue' | 'green' | 'yellow';

/** Позиция круга на экране. 'center' — только в блоке 1. */
export type SimonPosition = 'center' | 'left' | 'right' | 'up' | 'down';

/**
 * Конгруэнтность пробы: совпадает ли позиция стимула с позицией кнопки,
 * на которую отображается его цвет (red→left, blue→right, green→up,
 * yellow→down). 'neutral' — блок 1 (стимул в центре, конфликта нет).
 */
export type SimonCongruency = 'neutral' | 'congruent' | 'incongruent';

/** Номер блока сессии: 1 (5 проб), 2 (10 проб), 3 (20 проб). */
export type SimonBlock = 1 | 2 | 3;

/** Спланированная проба до предъявления (внутренняя структура сессии). */
export type SimonTrial = {
	block: SimonBlock;
	/** Сквозной номер пробы 1..35 (непрерывный по всем блокам). */
	trialIndex: number;
	color: SimonColor;
	position: SimonPosition;
	congruency: SimonCongruency;
};

/** Результат одной пробы — строка для БД (плоская, сериализуемая). */
export type SimonResult = {
	block: SimonBlock;
	/** Сквозной номер пробы 1..35: 1–5 блок 1, 6–15 блок 2, 16–35 блок 3. */
	trialIndex: number;
	color: SimonColor;
	position: SimonPosition;
	congruency: SimonCongruency;
	isCorrect: boolean;
	/** Время ответа, мс; при таймауте — ровно RESPONSE_WINDOW_MS (3000). */
	responseTimeMs: number;
	/** Таймаут => true и isCorrect false. */
	timedOut: boolean;
};
