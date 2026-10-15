import type { SimonBlock, SimonResult } from './types';

/**
 * Агрегаты результатов «Задания Симона» — чистый модуль чтения
 * (паттерн CONVENTIONS.md per-trial): сводки выводятся на лету из
 * построчных SimonResult, ничего не хранится в БД.
 *
 * Инварианты:
 * - summarize чиста и детерминирована (нет Date/random/IO);
 * - среднее время ответа считается ТОЛЬКО по отвеченным пробам
 *   (timedOut === false): таймаут несёт окно ответа (3000 мс), а не
 *   реальное время реакции, и его усреднение искажало бы метрику;
 * - ошибки включают таймауты (isCorrect false в обоих случаях);
 * - точность — доля 0..1 (форматирование в проценты — задача UI);
 * - пустой вход не бросает: overall с нулями, blocks [], эффект null.
 */

/** Сводка по набору проб (блок или вся сессия). */
export type SimonTotals = {
	/** Всего проб в наборе. */
	trials: number;
	/** Верных проб. */
	correct: number;
	/** Неверных проб (включая таймауты). */
	errors: number;
	/** Точность 0..1; 0 при пустом наборе. */
	accuracy: number;
	/**
	 * Среднее время ответа по отвеченным (не таймаут) пробам, мс;
	 * null — в наборе нет ни одной отвеченной пробы.
	 */
	meanResponseMs: number | null;
	/** Число таймаутов. */
	timeouts: number;
};

/** Сводка по одному блоку. */
export type SimonBlockSummary = SimonTotals & { block: SimonBlock };

/** Статистика эффекта Симона (инконгруэнтные − конгруэнтные). */
export type SimonEffectStats = {
	/** Среднее RT верных конгруэнтных проб, мс; null — данных нет. */
	congruentMeanMs: number | null;
	/** Среднее RT верных инконгруэнтных проб, мс; null — данных нет. */
	incongruentMeanMs: number | null;
	/**
	 * Эффект Симона, мс: incongruentMeanMs − congruentMeanMs.
	 * null — хотя бы с одной стороны нет данных (классическая метрика
	 * неопределима без обеих сторон сравнения).
	 */
	effectMs: number | null;
};

/** Полная сводка одной сессии. */
export type SimonSummary = {
	/** Итог по всем пробам сессии. */
	overall: SimonTotals;
	/** Сводки по блокам, присутствующим в данных (по возрастанию номера). */
	blocks: SimonBlockSummary[];
	/**
	 * Эффект Симона по блокам 2–3 ВМЕСТЕ (только верные отвеченные пробы;
	 * блок 1 — neutral, в него не входит). null, если хоть одна сторона
	 * не представлена.
	 */
	effect: SimonEffectStats;
	/** Эффект Симона по каждому блоку отдельно (ключи — присутствующие блоки). */
	effectByBlock: Partial<Record<SimonBlock, SimonEffectStats>>;
};

/** Среднее по массиву чисел; null — пустой массив. */
function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((a, v) => a + v, 0) / values.length;
}

/** Сводка по произвольному набору проб. */
function totalsOf(rows: SimonResult[]): SimonTotals {
	const correct = rows.filter((r) => r.isCorrect);
	const answered = rows.filter((r) => !r.timedOut);
	return {
		trials: rows.length,
		correct: correct.length,
		errors: rows.length - correct.length,
		accuracy: rows.length === 0 ? 0 : correct.length / rows.length,
		meanResponseMs: mean(answered.map((r) => r.responseTimeMs)),
		timeouts: rows.filter((r) => r.timedOut).length
	};
}

/**
 * Эффект Симона по набору проб: разность средних RT верных
 * конгруэнтных и инконгруэнтных проб. Таймауты и неверные пробы
 * исключены (RT ошибки и тем более таймаута не измеряют конфликт).
 */
function effectOf(rows: SimonResult[]): SimonEffectStats {
	const correctAnswered = rows.filter((r) => r.isCorrect && !r.timedOut);
	const congruentMeanMs = mean(
		correctAnswered.filter((r) => r.congruency === 'congruent').map((r) => r.responseTimeMs)
	);
	const incongruentMeanMs = mean(
		correctAnswered.filter((r) => r.congruency === 'incongruent').map((r) => r.responseTimeMs)
	);
	return {
		congruentMeanMs,
		incongruentMeanMs,
		effectMs:
			congruentMeanMs !== null && incongruentMeanMs !== null
				? incongruentMeanMs - congruentMeanMs
				: null
	};
}

/**
 * Строит сводку одной сессии из построчных результатов.
 * Чистая функция: одинаковый вход → побайтово одинаковый выход.
 */
export function summarize(results: SimonResult[]): SimonSummary {
	const byBlock = new Map<SimonBlock, SimonResult[]>();
	for (const r of results) {
		const bucket = byBlock.get(r.block);
		if (bucket) bucket.push(r);
		else byBlock.set(r.block, [r]);
	}

	const blockNumbers = [...byBlock.keys()].sort((a, b) => a - b);
	const blocks: SimonBlockSummary[] = blockNumbers.map((block) => ({
		block,
		...totalsOf(byBlock.get(block)!)
	}));

	const effectByBlock: Partial<Record<SimonBlock, SimonEffectStats>> = {};
	for (const block of blockNumbers) {
		effectByBlock[block] = effectOf(byBlock.get(block)!);
	}

	// Эффект Симона — по блокам 2–3 вместе (блок 1 neutral: конфликта нет).
	const conflictRows = results.filter((r) => r.block !== 1);

	return {
		overall: totalsOf(results),
		blocks,
		effect: effectOf(conflictRows),
		effectByBlock
	};
}
