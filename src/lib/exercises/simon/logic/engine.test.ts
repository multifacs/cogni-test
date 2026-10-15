import { describe, it, expect } from 'vitest';
import {
	BLOCK1_TRIALS,
	BLOCK2_TRIALS,
	BLOCK3_TRIALS,
	TOTAL_TRIALS,
	RESPONSE_WINDOW_MS,
	COLOR_TO_POSITION,
	buildSession,
	evaluateTrial,
	buildMeta,
	isSimonColor
} from './engine';
import type { SimonTrial } from '../types';

// Детерминированный PRNG (mulberry32) для воспроизводимых тестов —
// тот же, что в corsi-block/logic/engine.test.ts.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Подсчёт вхождений по ключу-функции (балансовые проверки). */
function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of items) {
		const k = key(item);
		counts[k] = (counts[k] ?? 0) + 1;
	}
	return counts;
}

describe('buildSession: структура сессии', () => {
	it('возвращает ровно TOTAL_TRIALS проб со сквозным trialIndex 1..35 и блоками 5/10/20 по порядку', () => {
		const session = buildSession(mulberry32(42));
		expect(session).toHaveLength(TOTAL_TRIALS);
		expect(TOTAL_TRIALS).toBe(35);

		// Сквозной индекс без дыр и дублей, начинается с 1.
		expect(session.map((t) => t.trialIndex)).toEqual(
			Array.from({ length: TOTAL_TRIALS }, (_, i) => i + 1)
		);

		// Блоки идут по порядку и в правильном объёме.
		const blockSizes = countBy(session, (t) => String(t.block));
		expect(blockSizes['1']).toBe(BLOCK1_TRIALS);
		expect(blockSizes['2']).toBe(BLOCK2_TRIALS);
		expect(blockSizes['3']).toBe(BLOCK3_TRIALS);
		expect(session[0]!.block).toBe(1);
		expect(session[BLOCK1_TRIALS]!.block).toBe(2);
		expect(session[BLOCK1_TRIALS + BLOCK2_TRIALS]!.block).toBe(3);
		for (const trial of session) {
			if (trial.block === 1) expect(trial.trialIndex).toBeGreaterThanOrEqual(1);
			if (trial.block === 2) expect(trial.trialIndex).toBeGreaterThanOrEqual(6);
			if (trial.block === 3) expect(trial.trialIndex).toBeGreaterThanOrEqual(16);
		}
	});

	it('детерминирован: один и тот же сид даёт идентичную сессию', () => {
		expect(buildSession(mulberry32(99))).toEqual(buildSession(mulberry32(99)));
	});

	it('различается между разными сидами (порядок реально перемешивается)', () => {
		const sessions = [1, 2, 3, 4, 5].map((seed) => buildSession(mulberry32(seed)));
		const distinct = new Set(sessions.map((s) => JSON.stringify(s)));
		expect(distinct.size).toBeGreaterThan(1);
	});
});

describe('buildSession: балансовые инварианты (50 сидов)', () => {
	const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

	it('блок 1: цвета red/blue 3/2 или 2/3, позиция center, конгруэнтность neutral', () => {
		for (const seed of SEEDS) {
			const block1 = buildSession(mulberry32(seed)).filter((t) => t.block === 1);
			const colors = countBy(block1, (t) => t.color);
			const red = colors['red'] ?? 0;
			const blue = colors['blue'] ?? 0;
			expect(red + blue).toBe(BLOCK1_TRIALS);
			// Баланс «насколько возможно» при нечётном объёме: 3/2 или 2/3.
			expect(Math.max(red, blue)).toBe(3);
			expect(Math.min(red, blue)).toBe(2);
			for (const trial of block1) {
				expect(['red', 'blue']).toContain(trial.color); // только 2 цвета
				expect(trial.position).toBe('center');
				expect(trial.congruency).toBe('neutral');
			}
		}
	});

	it('блок 2: цвета 5/5, конгруэнтность 5/5, только left/right, только red/blue', () => {
		for (const seed of SEEDS) {
			const block2 = buildSession(mulberry32(seed)).filter((t) => t.block === 2);
			expect(block2).toHaveLength(BLOCK2_TRIALS);
			const colors = countBy(block2, (t) => t.color);
			expect(colors['red']).toBe(5);
			expect(colors['blue']).toBe(5);
			const congruency = countBy(block2, (t) => t.congruency);
			expect(congruency['congruent']).toBe(5);
			expect(congruency['incongruent']).toBe(5);
			for (const trial of block2) {
				expect(['red', 'blue']).toContain(trial.color);
				expect(['left', 'right']).toContain(trial.position);
			}
		}
	});

	it('блок 3: цвета 5/5/5/5, конгруэнтность 10/10, без center', () => {
		for (const seed of SEEDS) {
			const block3 = buildSession(mulberry32(seed)).filter((t) => t.block === 3);
			expect(block3).toHaveLength(BLOCK3_TRIALS);
			const colors = countBy(block3, (t) => t.color);
			expect(colors['red']).toBe(5);
			expect(colors['blue']).toBe(5);
			expect(colors['green']).toBe(5);
			expect(colors['yellow']).toBe(5);
			const congruency = countBy(block3, (t) => t.congruency);
			expect(congruency['congruent']).toBe(10);
			expect(congruency['incongruent']).toBe(10);
			for (const trial of block3) {
				expect(trial.position).not.toBe('center');
				expect(['left', 'right', 'up', 'down']).toContain(trial.position);
			}
		}
	});

	it('позиция center только в блоке 1; green/yellow только в блоке 3; neutral ⟺ блок 1', () => {
		for (const seed of SEEDS) {
			for (const trial of buildSession(mulberry32(seed))) {
				if (trial.block !== 1) {
					expect(trial.position).not.toBe('center');
					expect(trial.congruency).not.toBe('neutral');
				} else {
					expect(trial.congruency).toBe('neutral');
					expect(['red', 'blue']).toContain(trial.color);
				}
				if (trial.block !== 3) {
					expect(['red', 'blue']).toContain(trial.color);
				}
			}
		}
	});

	it('конгруэнтность корректна: в блоках 2–3 congruent ⟺ position === COLOR_TO_POSITION[color]', () => {
		for (const seed of SEEDS) {
			const conflictTrials = buildSession(mulberry32(seed)).filter(
				(t) => t.block === 2 || t.block === 3
			);
			for (const trial of conflictTrials) {
				const expected = trial.position === COLOR_TO_POSITION[trial.color];
				expect(trial.congruency === 'congruent').toBe(expected);
			}
		}
	});
});

describe('evaluateTrial', () => {
	const trial: SimonTrial = {
		block: 3,
		trialIndex: 16,
		color: 'green',
		position: 'up',
		congruency: 'congruent'
	};

	it('верный ответ: isCorrect true, время пробрасывается как есть', () => {
		const result = evaluateTrial(trial, 'green', 850);
		expect(result.isCorrect).toBe(true);
		expect(result.timedOut).toBe(false);
		expect(result.responseTimeMs).toBe(850);
		expect(result.trialIndex).toBe(16);
		expect(result.block).toBe(3);
		expect(result.color).toBe('green');
		expect(result.position).toBe('up');
		expect(result.congruency).toBe('congruent');
	});

	it('неверный ответ: isCorrect false, timedOut false', () => {
		const result = evaluateTrial(trial, 'red', 1200);
		expect(result.isCorrect).toBe(false);
		expect(result.timedOut).toBe(false);
		expect(result.responseTimeMs).toBe(1200);
	});

	it('таймаут (null): timedOut true, isCorrect false, responseTimeMs = окно', () => {
		const result = evaluateTrial(trial, null, RESPONSE_WINDOW_MS);
		expect(result.timedOut).toBe(true);
		expect(result.isCorrect).toBe(false);
		expect(result.responseTimeMs).toBe(RESPONSE_WINDOW_MS);
	});

	it('кастомное окно: таймаут тарифицируется по кастомному windowMs', () => {
		const result = evaluateTrial(trial, null, 5000, 5000);
		expect(result.responseTimeMs).toBe(5000);
		expect(result.timedOut).toBe(true);
	});

	it('fail-loud guard: отрицательное или сверхоконное время — throw', () => {
		expect(() => evaluateTrial(trial, 'green', -1)).toThrow();
		expect(() => evaluateTrial(trial, 'green', RESPONSE_WINDOW_MS + 1)).toThrow();
		expect(() => evaluateTrial(trial, 'green', Number.NaN)).toThrow();
		// Границы окна легальны.
		expect(() => evaluateTrial(trial, 'green', 0)).not.toThrow();
		expect(() => evaluateTrial(trial, 'green', RESPONSE_WINDOW_MS)).not.toThrow();
	});
});

describe('buildMeta', () => {
	it('возвращает строковые метаданные о сессии', () => {
		expect(buildMeta()).toEqual({
			blocks: `${BLOCK1_TRIALS}+${BLOCK2_TRIALS}+${BLOCK3_TRIALS}`,
			windowMs: String(RESPONSE_WINDOW_MS)
		});
	});
});

describe('isSimonColor', () => {
	it('принимает валидные цвета и отклоняет всё остальное', () => {
		for (const color of ['red', 'blue', 'green', 'yellow']) {
			expect(isSimonColor(color)).toBe(true);
		}
		expect(isSimonColor('purple')).toBe(false);
		expect(isSimonColor('')).toBe(false);
		expect(isSimonColor(42)).toBe(false);
		expect(isSimonColor(null)).toBe(false);
		expect(isSimonColor(undefined)).toBe(false);
	});
});
