/**
 * Типы упражнения «Задание Симона» (Simon task) — классическая
 * конфликтная парадигма стимул–ответ.
 *
 * Инварианты (см. logic/engine.ts):
 * - Части идут на время: 10 / 30 / 60 секунд. Число проб не фиксировано —
 *   пробы генерируются непрерывно, пока не истечёт таймер части.
 * - Часть 1: красный/синий круг в центре, ответ стрелкой по цвету
 *   (конгруэнтность всегда 'neutral' — пространственного конфликта нет).
 * - Часть 2: красный/синий круг слева/справа, ответ по ЦВЕТУ, а не по
 *   позиции.
 * - Часть 3: 4 цвета (red/blue/green/yellow), 4 позиции
 *   (left/right/up/down), ответ по цвету.
 *
 * SimonResult — плоская сериализуемая строка БД (без методов, без Date):
 * регистрируется в ExerciseResultMap/ExerciseResult/ExerciseResults как
 * per-trial строка (паттерн CONVENTIONS.md). trialIndex — порядковый номер
 * СОХРАНЁННОГО ответа 1..N: он присваивается в момент ответа, поэтому
 * номера непрерывны даже если неотвеченная проба на границе части
 * отброшена. trialIndex — ключ сортировки при чтении (asc(f.trialIndex)).
 */

/** Цвет стимула. В частях 1–2 доступны только 'red' | 'blue'. */
export type SimonColor = 'red' | 'blue' | 'green' | 'yellow';

/** Позиция круга на экране. 'center' — только в части 1. */
export type SimonPosition = 'center' | 'left' | 'right' | 'up' | 'down';

/**
 * Конгруэнтность пробы: совпадает ли позиция стимула с направлением
 * стрелки, на которую отображается его цвет (red→left, blue→right,
 * green→up, yellow→down). 'neutral' — часть 1 (стимул в центре,
 * конфликта нет).
 */
export type SimonCongruency = 'neutral' | 'congruent' | 'incongruent';

/** Номер части сессии: 1 (10 с), 2 (30 с), 3 (60 с). */
export type SimonBlock = 1 | 2 | 3;

/** Сгенерированная проба до предъявления (внутренняя структура сессии). */
export type SimonTrial = {
	block: SimonBlock;
	color: SimonColor;
	position: SimonPosition;
	congruency: SimonCongruency;
};

/** Результат одной пробы — строка для БД (плоская, сериализуемая). */
export type SimonResult = {
	block: SimonBlock;
	/**
	 * Порядковый номер сохранённого ответа, 1..N, непрерывный в рамках
	 * сессии (неотвеченные пробы на границе части не нумеруются).
	 */
	trialIndex: number;
	color: SimonColor;
	position: SimonPosition;
	congruency: SimonCongruency;
	isCorrect: boolean;
	/** Время ответа, мс. */
	responseTimeMs: number;
	/**
	 * В новых сессиях всегда false: лимита на отдельную пробу нет.
	 * Поле сохранено для совместимости со старыми данными.
	 */
	timedOut: boolean;
};
